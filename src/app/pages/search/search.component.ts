import { DatePipe, JsonPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { NotificationPanelService } from '../../core/notification-panel.service';
import { SearchService } from '../../core/search.service';
import type { SearchEntityType, SearchHistory } from '../../core/types';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    JsonPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent {
  private readonly service = inject(SearchService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  readonly history = signal<SearchHistory[]>([]);
  readonly loadingHistory = signal(false);

  readonly historyColumns = ['entity', 'query', 'filters', 'created'];

  readonly logForm = this.fb.group({
    entity_type: ['BOM' as SearchEntityType],
    query: [''],
    filters: ['']
  });

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loadingHistory.set(true);
    this.service.listHistory().subscribe({
      next: (resp) => {
        this.history.set(resp.results || []);
        this.loadingHistory.set(false);
      },
      error: (err) => {
        this.loadingHistory.set(false);
        this.notify.errorFrom(err, 'Failed to load search history');
      }
    });
  }

  logSearch(): void {
    const payload = this.logForm.getRawValue();
    let filters: any = undefined;
    if (payload.filters) {
      try {
        filters = JSON.parse(payload.filters);
      } catch {
        this.notify.error('Filters must be valid JSON');
        return;
      }
    }
    this.service.logHistory({
      entity_type: payload.entity_type as SearchEntityType,
      query: payload.query || '',
      filters
    }).subscribe({
      next: () => {
        this.notify.success('Search logged');
        this.logForm.reset({ entity_type: 'BOM', query: '', filters: '' });
        this.loadHistory();
      },
      error: (err) => this.notify.errorFrom(err, 'Unable to log search')
    });
  }

}
