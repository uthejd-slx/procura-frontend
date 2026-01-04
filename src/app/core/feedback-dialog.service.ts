import { inject, Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { FeedbackDialogComponent } from '../pages/feedback/feedback-dialog.component';

@Injectable({ providedIn: 'root' })
export class FeedbackDialogService {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private ref: MatDialogRef<FeedbackDialogComponent> | null = null;
  private draft: (FeedbackDialogComponent['getDraft'] extends () => infer R ? R : never) | null = null;

  open() {
    if (this.ref) {
      this.ref.close();
      this.ref = null;
      return null;
    }
    this.ref = this.dialog.open(FeedbackDialogComponent, {
      panelClass: ['pt-dialog-panel', 'pt-feedback-panel'],
      width: '340px',
      height: '62vh',
      maxWidth: '94vw',
      maxHeight: '86vh',
      hasBackdrop: true,
      backdropClass: 'pt-feedback-backdrop',
      position: {
        bottom: '76px',
        left: '20px'
      },
      autoFocus: false,
      restoreFocus: false,
      data: {
        pageUrl: this.router.url,
        draft: this.draft || undefined
      }
    });
    this.ref.beforeClosed().subscribe((result: { reset?: boolean } | undefined) => {
      if (result?.reset) {
        this.draft = null;
        return;
      }
      const instance = this.ref?.componentInstance;
      if (instance) this.draft = instance.getDraft();
    });
    this.ref.afterClosed().subscribe(() => {
      this.ref = null;
    });
    return this.ref;
  }

  close(): void {
    this.ref?.close();
    this.ref = null;
  }
}
