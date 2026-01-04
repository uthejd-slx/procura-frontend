import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, tap } from 'rxjs';

import { API_BASE_URL } from './api-base-url';
import type { ApiNotification, PaginatedResponse } from './types';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  list(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<ApiNotification>>(`${this.baseUrl}/notifications/`, {
      params: this.buildParams(params)
    });
  }

  refreshUnread() {
    return this.getUnreadCount();
  }

  getUnreadCount() {
    return this.http
      .get<{ unread: number }>(`${this.baseUrl}/notifications/unread-count/`)
      .pipe(
        tap((resp) => this.setUnreadCount(resp.unread)),
        map((resp) => resp.unread)
      );
  }

  setUnreadCount(count: number): void {
    this._unreadCount.set(Math.max(0, count));
  }

  clearUnread(): void {
    this._unreadCount.set(0);
  }

  markRead(id: number) {
    return this.http.post(`${this.baseUrl}/notifications/${id}/mark-read/`, {});
  }

  markAllRead() {
    return this.http.post(`${this.baseUrl}/notifications/mark-all-read/`, {});
  }

  private buildParams(params?: Record<string, string | number | boolean | string[] | null | undefined>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') continue;
      if (Array.isArray(value)) {
        const joined = value.map((v) => String(v)).filter(Boolean).join(',');
        if (joined) httpParams = httpParams.set(key, joined);
        continue;
      }
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }
}
