import { effect, inject, Injectable, NgZone } from '@angular/core';

import { HttpBackend, HttpClient } from '@angular/common/http';
import { catchError, finalize, map, of, shareReplay } from 'rxjs';

import { API_BASE_URL } from './api-base-url';
import { NotificationsService } from './notifications.service';
import { TokenStorageService } from './token-storage.service';

type NotificationSseEvent =
  | { type: 'unread_count'; unread: number }
  | { type: 'notification'; id: number; unread: number };

@Injectable({ providedIn: 'root' })
export class NotificationSseService {
  private readonly notifications = inject(NotificationsService);
  private readonly tokens = inject(TokenStorageService);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly zone = inject(NgZone);
  private readonly httpBackend = inject(HttpBackend);
  private readonly rawHttp = new HttpClient(this.httpBackend);

  private eventSource: EventSource | null = null;
  private reconnectTimer: number | null = null;
  private reconnectIndex = 0;
  private active = false;
  private lastToken: string | null = null;
  private didLogToken = false;
  private errorCount = 0;
  private refreshInFlight$: ReturnType<HttpClient['post']> | null = null;

  private pollTimer: number | null = null;
  private readonly pollDelayMs = 60000;
  private readonly enableFallbackPolling = true;
  private readonly maxErrorsBeforeFallback = 3;
  private readonly reconnectDelays = [1000, 2000, 5000, 10000];
  private readonly debug =
    typeof window !== 'undefined' && window.localStorage?.getItem('debugSse') === '1';

  constructor() {
    effect(() => {
      const token = this.tokens.accessToken();
      if (!this.didLogToken) {
        this.logTokenSnapshot(token);
        this.didLogToken = true;
      }
      if (token) {
        this.start();
      } else {
        this.stop();
      }
    });

    effect(() => {
      const token = this.tokens.accessToken();
      if (!this.active) return;
      if (!token) {
        this.stop();
        return;
      }
      if (token !== this.lastToken) {
        this.refresh();
      }
    });
  }

  start(): void {
    if (this.active) return;
    this.log('start');
    this.active = true;
    this.connect();
  }

  stop(): void {
    this.log('stop');
    this.active = false;
    this.lastToken = null;
    this.errorCount = 0;
    this.cleanupEventSource();
    this.clearReconnect();
    this.stopFallbackPoll();
  }

  refresh(): void {
    if (!this.active) return;
    this.cleanupEventSource();
    this.clearReconnect();
    this.connect();
  }

  private connect(): void {
    const token = this.tokens.getAccessToken();
    if (!token) {
      this.log('connect: missing access token');
      return;
    }
    if (this.isTokenExpired(token)) {
      this.log('connect: access token expired, refreshing');
      this.tryRefreshToken();
      return;
    }
    this.lastToken = token;
    const url = this.buildStreamUrl(token);
    try {
      this.log(`connect: ${url}`);
      this.eventSource = new EventSource(url);
    } catch {
      this.log('connect: EventSource constructor failed');
      this.scheduleReconnect();
      return;
    }

    this.eventSource.onopen = () => {
      this.log('open');
      this.errorCount = 0;
      this.reconnectIndex = 0;
      this.stopFallbackPoll();
    };

    this.eventSource.onmessage = (event) => {
      this.zone.run(() => this.handleMessage(event.data));
    };
    this.eventSource.addEventListener('unread_count', (event) => {
      const messageEvent = event as MessageEvent<string>;
      this.zone.run(() => this.handleMessage(messageEvent.data, 'unread_count'));
    });
    this.eventSource.addEventListener('notification', (event) => {
      const messageEvent = event as MessageEvent<string>;
      this.zone.run(() => this.handleMessage(messageEvent.data, 'notification'));
    });

    this.eventSource.onerror = () => {
      this.log('error');
      this.handleError();
    };
  }

  private buildStreamUrl(token: string): string {
    const path = `${this.baseUrl}/notifications/stream/`;
    let url: URL;
    try {
      url = new URL(path);
    } catch {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      url = new URL(path, origin);
    }
    url.searchParams.set('token', token);
    return url.toString();
  }

  private handleMessage(raw: string, fallbackType?: NotificationSseEvent['type']): void {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<NotificationSseEvent> & { unread?: number | string };
      if (!parsed || typeof parsed !== 'object') return;
      const unreadValue = Number(parsed.unread);
      const hasUnread = Number.isFinite(unreadValue);
      const eventType = parsed.type || fallbackType || (hasUnread ? 'unread_count' : undefined);
      this.log('message', { eventType, unread: parsed.unread });
      if (eventType === 'unread_count' && hasUnread) {
        this.notifications.setUnreadCount(unreadValue);
        return;
      }
      if (eventType === 'notification' && hasUnread) {
        this.notifications.setUnreadCount(unreadValue);
        this.notifications.notifyIncoming();
      }
    } catch {
      // Ignore malformed payloads.
    }
  }

  private handleError(): void {
    if (!this.active) return;
    this.errorCount += 1;
    this.log('handleError', { errorCount: this.errorCount });
    if (this.enableFallbackPolling && this.errorCount >= this.maxErrorsBeforeFallback) {
      this.startFallbackPoll();
    }
    this.cleanupEventSource();
    if (this.tryRefreshToken()) {
      return;
    }
    this.scheduleReconnect();
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeJwtPayload(token);
    const exp = typeof payload?.exp === 'number' ? payload.exp : null;
    if (!exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return exp <= now + 30;
  }

  private decodeJwtPayload(token: string): { exp?: number } | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private logTokenSnapshot(token: string | null): void {
    if (typeof window === 'undefined') return;
    if (!token) {
      console.info('[Auth] access token: none');
      return;
    }
    const payload = this.decodeJwtPayload(token);
    const exp = typeof payload?.exp === 'number' ? payload.exp : null;
    if (!exp) {
      console.info('[Auth] access token: present (exp unknown)');
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = Math.max(0, exp - now);
    const expIso = new Date(exp * 1000).toISOString();
    console.info('[Auth] access token: present', { exp: expIso, secondsRemaining });
  }

  private scheduleReconnect(): void {
    if (!this.active) return;
    if (this.reconnectTimer !== null) return;
    const delay = this.reconnectDelays[Math.min(this.reconnectIndex, this.reconnectDelays.length - 1)];
    this.reconnectIndex += 1;
    this.log(`reconnect in ${delay}ms`);
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private cleanupEventSource(): void {
    if (!this.eventSource) return;
    try {
      this.log('close');
      this.eventSource.close();
    } catch {
      // ignore
    }
    this.eventSource = null;
  }

  private clearReconnect(): void {
    if (this.reconnectTimer === null) return;
    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private tryRefreshToken(): boolean {
    if (this.refreshInFlight$) return true;
    const refresh = this.tokens.getRefreshToken();
    if (!refresh) {
      this.log('refresh: missing refresh token');
      return false;
    }
    this.refreshInFlight$ = this.rawHttp
      .post<{ access: string }>(`${this.baseUrl}/auth/token/refresh/`, { refresh })
      .pipe(
        map((resp) => resp.access),
        map((newAccess) => {
          this.tokens.setAccessToken(newAccess);
          return newAccess;
        }),
        catchError(() => {
          this.log('refresh: failed');
          this.tokens.clear();
          return of(null);
        }),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1)
      );
    this.refreshInFlight$.subscribe((token) => {
      if (token) {
        this.log('refresh: success');
        this.connect();
      } else {
        this.stop();
      }
    });
    return true;
  }

  private startFallbackPoll(): void {
    if (!this.enableFallbackPolling || this.pollTimer !== null) return;
    this.pollTimer = window.setInterval(() => {
      this.notifications.refreshUnread().subscribe({ error: () => undefined });
    }, this.pollDelayMs);
  }

  private stopFallbackPoll(): void {
    if (this.pollTimer === null) return;
    window.clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (!this.debug) return;
    if (data) {
      console.info('[SSE]', message, data);
    } else {
      console.info('[SSE]', message);
    }
  }
}
