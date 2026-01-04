import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { NotificationPanelService } from './notification-panel.service';

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationPanelService);
  return next(req).pipe(
    catchError((err) => {
      if (err?.status === 429) {
        notify.error('Too many requests. Please wait a moment and try again.');
      }
      if (err?.status === 413) {
        notify.error('Upload is too large for the server limit.');
      }
      return throwError(() => err);
    })
  );
};
