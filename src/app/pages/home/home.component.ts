import { DatePipe, NgFor, NgIf } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '../../core/auth.service';
import { BomService } from '../../core/bom.service';
import { NotificationPanelService } from '../../core/notification-panel.service';
import { NotificationsDialogService } from '../../core/notifications-dialog.service';
import type { Bom } from '../../core/types';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly bomService = inject(BomService);
  private readonly notificationsDialog = inject(NotificationsDialogService);
  private readonly notify = inject(NotificationPanelService);

  readonly isAdmin = computed(() => this.auth.hasRole('admin'));
  readonly canProcure = computed(() => this.auth.hasRole('procurement') || this.auth.hasRole('admin'));
  readonly canApprove = computed(() => this.auth.hasRole('approver') || this.auth.hasRole('admin'));
  readonly userEmail = computed(() => this.auth.user$()?.email || '');

  loadingBoms = false;
  recentBoms: Bom[] = [];

  ngOnInit(): void {
    this.loadRecentBoms();
  }

  private loadRecentBoms(): void {
    this.loadingBoms = true;
    this.bomService.listBoms({ page_size: 5 }).subscribe({
      next: (resp) => {
        this.recentBoms = resp.results || [];
        this.loadingBoms = false;
      },
      error: () => {
        this.loadingBoms = false;
        this.notify.error('Failed to load recent BOMs');
      }
    });
  }

  openNotifications(): void {
    this.notificationsDialog.open();
  }
}
