import { DatePipe, JsonPipe, NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import type { BomEvent } from '../../core/types';
import { BomService } from '../../core/bom.service';
import { NotificationPanelService } from '../../core/notification-panel.service';

@Component({
  selector: 'app-bom-events',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    JsonPipe,
    RouterLink,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './bom-events.component.html',
  styleUrl: './bom-events.component.scss',
})
export class BomEventsComponent {
  private readonly bomService = inject(BomService);
  private readonly notify = inject(NotificationPanelService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly events = signal<BomEvent[]>([]);
  bomId = 0;
  showData = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe((p) => {
      this.bomId = Number(p.get('id') || 0);
      if (this.bomId) this.reload();
    });
  }

  reload(): void {
    if (!this.bomId) return;
    this.loading.set(true);
    this.bomService.listEvents({ bom_id: this.bomId, order: '-created_at', page_size: 100 }).subscribe({
      next: (resp) => {
        this.events.set(resp.results || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load events');
      }
    });
  }
}
