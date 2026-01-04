import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { NotificationPanelService } from '../../core/notification-panel.service';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [NgIf, NgFor, MatIconModule],
  templateUrl: './notification-panel.component.html',
  styleUrl: './notification-panel.component.scss'
})
export class NotificationPanelComponent {
  private readonly panel = inject(NotificationPanelService);
  readonly items = this.panel.items;

  dismiss(id: number): void {
    this.panel.dismiss(id);
  }
}
