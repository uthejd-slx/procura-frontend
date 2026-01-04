import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, of, shareReplay, switchMap, throwError } from 'rxjs';

import { API_BASE_URL } from './api-base-url';
import { TokenStorageService } from './token-storage.service';

let refreshInFlight$: Observable<string | null> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const httpBackend = inject(HttpBackend);
  const rawHttp = new HttpClient(httpBackend);
  const apiBaseUrl = inject(API_BASE_URL);
  const router = inject(Router);
  const accessToken = tokenStorage.getAccessToken();

  const authReq = accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      const isUnauthorized = err.status === 401;
      const alreadyRetried = req.headers.has('X-Auth-Retry');
      const isRefreshCall = req.url.includes('/auth/token/refresh/');
      const hasRefreshToken = !!tokenStorage.getRefreshToken();

      if (!isUnauthorized || alreadyRetried || isRefreshCall || !hasRefreshToken) {
        return throwError(() => err);
      }

      if (!refreshInFlight$) {
        const refresh = tokenStorage.getRefreshToken();

        refreshInFlight$ = rawHttp
          .post<{ access: string }>(`${apiBaseUrl}/auth/token/refresh/`, { refresh })
          .pipe(
            map((resp) => resp.access),
            map((newAccess) => {
              tokenStorage.setAccessToken(newAccess);
              return newAccess;
            }),
            catchError(() => {
              tokenStorage.clear();
              router.navigateByUrl('/login');
              return of(null);
            }),
            finalize(() => {
              refreshInFlight$ = null;
            }),
            shareReplay(1)
          );
      }

      return refreshInFlight$.pipe(
        switchMap((newAccessToken) => {
          if (!newAccessToken) {
            return throwError(() => err);
          }

          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
              'X-Auth-Retry': '1'
            }
          });
          return next(retryReq);
        })
      );
    })
  );
};
