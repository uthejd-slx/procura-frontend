import { effect, inject, Injectable, isDevMode } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { NotificationsService } from './notifications.service';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class NotificationPollingService {
  private readonly notifications = inject(NotificationsService);
  private readonly tokens = inject(TokenStorageService);
  private readonly dev = isDevMode();
  private readonly baseIntervalMs = 300;
  private readonly backoffIntervalMs = 1000;
  private readonly maxFailures = 3;

  private timerId: number | null = null;
  private inFlight = false;
  private failures = 0;
  private intervalMs = this.baseIntervalMs;

  constructor() {
    effect(() => {
      const token = this.tokens.accessToken();
      if (token) {
        this.start();
      } else {
        this.stop();
      }
    });
  }

  start(): void {
    if (this.timerId !== null) return;
    this.failures = 0;
    this.intervalMs = this.baseIntervalMs;
    this.log('start', { intervalMs: this.intervalMs });
    this.pollOnce();
    this.timerId = window.setInterval(() => this.pollOnce(), this.intervalMs);
  }

  stop(): void {
    if (this.timerId === null) return;
    this.log('stop');
    window.clearInterval(this.timerId);
    this.timerId = null;
    this.inFlight = false;
    this.failures = 0;
    this.intervalMs = this.baseIntervalMs;
  }

  private pollOnce(): void {
    if (this.inFlight) return;
    this.inFlight = true;
    this.log('tick');
    this.notifications.refreshUnread().subscribe({
      next: () => {
        this.inFlight = false;
        this.log('success');
        this.handleSuccess();
      },
      error: (err) => {
        this.inFlight = false;
        this.handleError(err);
      }
    });
  }

  private handleSuccess(): void {
    if (this.failures === 0 && this.intervalMs === this.baseIntervalMs) return;
    this.failures = 0;
    if (this.intervalMs !== this.baseIntervalMs) {
      this.intervalMs = this.baseIntervalMs;
      this.log('backoff-reset', { intervalMs: this.intervalMs });
      this.restartInterval();
    }
  }

  private handleError(err: unknown): void {
    this.failures += 1;
    if (this.dev) {
      const status = err instanceof HttpErrorResponse ? err.status : 'unknown';
      console.warn('[Notifications] polling error', { status });
    }
    if (this.failures >= this.maxFailures && this.intervalMs !== this.backoffIntervalMs) {
      this.intervalMs = this.backoffIntervalMs;
      this.log('backoff', { intervalMs: this.intervalMs });
      this.restartInterval();
    }
  }

  private restartInterval(): void {
    if (this.timerId === null) return;
    window.clearInterval(this.timerId);
    this.log('restart', { intervalMs: this.intervalMs });
    this.timerId = window.setInterval(() => this.pollOnce(), this.intervalMs);
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;
    const enabled = window.localStorage?.getItem('debugPolling') === '1';
    if (!enabled) return;
    if (data) {
      console.info('[Notifications] poll', message, data);
    } else {
      console.info('[Notifications] poll', message);
    }
  }
}
