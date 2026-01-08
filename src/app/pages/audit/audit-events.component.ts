import { DatePipe, JsonPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';

import { BomService } from '../../core/bom.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import type { BomEvent } from '../../core/types';

@Component({
  selector: 'app-audit-events',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    JsonPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './audit-events.component.html',
  styleUrl: './audit-events.component.scss'
})
export class AuditEventsComponent {
  private readonly bomService = inject(BomService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  loading = false;
  events: BomEvent[] = [];
  total = 0;
  page = 1;
  pageSize = 25;
  hasNext = false;
  hasPrev = false;

  readonly displayedColumns = ['event', 'actor', 'bom', 'created'];

  readonly filterForm = this.fb.group({
    bom_id: [''],
    actor_id: [''],
    event_type: [''],
    created_from: [''],
    created_to: [''],
    order: ['-created_at']
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    const filters = this.filterForm.getRawValue();
    this.bomService
      .listEvents({
        bom_id: filters.bom_id?.trim(),
        actor_id: filters.actor_id?.trim(),
        event_type: filters.event_type?.trim(),
        created_from: filters.created_from || undefined,
        created_to: filters.created_to || undefined,
        order: filters.order || '-created_at',
        page: this.page,
        page_size: this.pageSize
      })
      .subscribe({
        next: (resp) => {
          this.events = resp.results || [];
          this.total = resp.count || 0;
          this.hasNext = !!resp.next;
          this.hasPrev = !!resp.previous;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.notify.errorFrom(err, 'Failed to load audit events');
        }
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.reload();
  }

  resetFilters(): void {
    this.filterForm.reset({
      bom_id: '',
      actor_id: '',
      event_type: '',
      created_from: '',
      created_to: '',
      order: '-created_at'
    });
    this.page = 1;
    this.reload();
  }

  prevPage(): void {
    if (!this.hasPrev) return;
    this.page = Math.max(1, this.page - 1);
    this.reload();
  }

  nextPage(): void {
    if (!this.hasNext) return;
    this.page += 1;
    this.reload();
  }

  updatePageSize(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.reload();
  }
}
