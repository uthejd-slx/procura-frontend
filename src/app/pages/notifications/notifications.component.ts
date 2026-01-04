import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import type { ApiNotification } from '../../core/types';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { NotificationsService } from '../../core/notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent {
  private readonly dialogRef = inject(MatDialogRef<NotificationsComponent>);
  private readonly notificationsService = inject(NotificationsService);
  private readonly notify = inject(NotificationPanelService);
  private readonly fb = inject(FormBuilder);

  loading = false;
  notifications: ApiNotification[] = [];
  total = 0;
  page = 1;
  pageSize = 10;
  hasNext = false;
  hasPrev = false;
  readonly filterForm = this.fb.group({
    readState: ['all'],
    levels: [[] as string[]],
    created_from: [''],
    created_to: ['']
  });

  get unreadCount(): number {
    return this.notifications.filter((n) => !n.is_read).length;
  }

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading = true;
    const filters = this.filterForm.getRawValue();
    const params: Record<string, any> = {
      page: this.page,
      page_size: this.pageSize,
      level: filters.levels,
      created_from: filters.created_from || undefined,
      created_to: filters.created_to || undefined
    };
    if (filters.readState === 'unread') params['unread'] = 1;
    if (filters.readState === 'read') params['read'] = 1;

    this.notificationsService.list(params).subscribe({
      next: (resp) => {
        this.notifications = resp.results || [];
        this.total = resp.count || 0;
        this.hasNext = !!resp.next;
        this.hasPrev = !!resp.previous;
        this.loading = false;
        this.notificationsService.refreshUnread().subscribe({ error: () => undefined });
      },
      error: () => {
        this.loading = false;
        this.notify.error('Failed to load notifications');
      }
    });
  }

  markRead(n: ApiNotification): void {
    if (n.is_read) return;
    this.notificationsService.markRead(n.id).subscribe({
      next: () => {
        n.is_read = true;
        this.reload();
        this.notificationsService.refreshUnread().subscribe({ error: () => undefined });
        this.notify.success('Marked as read');
      },
      error: () => this.notify.error('Failed to mark read')
    });
  }

  markAllRead(): void {
    this.notificationsService.markAllRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map((n) => ({ ...n, is_read: true }));
        this.reload();
        this.notificationsService.refreshUnread().subscribe({ error: () => undefined });
        this.notify.success('All notifications marked read');
      },
      error: () => this.notify.error('Failed to mark all read')
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.reload();
  }

  resetFilters(): void {
    this.filterForm.reset({
      readState: 'all',
      levels: [],
      created_from: '',
      created_to: ''
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

  close(): void {
    this.dialogRef.close();
  }
}

