import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { NotificationsComponent } from '../pages/notifications/notifications.component';

@Injectable({ providedIn: 'root' })
export class NotificationsDialogService {
  private readonly dialog = inject(MatDialog);

  open() {
    return this.dialog.open(NotificationsComponent, {
      panelClass: 'pt-dialog-panel',
      width: '640px',
      maxWidth: '92vw',
      maxHeight: '82vh',
      autoFocus: false,
      restoreFocus: false
    });
  }
}
