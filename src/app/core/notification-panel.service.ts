import { Injectable, signal } from '@angular/core';

export type NoticeVariant = 'info' | 'success' | 'error';

export interface NoticeItem {
  id: number;
  message: string;
  variant: NoticeVariant;
}

@Injectable({ providedIn: 'root' })
export class NotificationPanelService {
  private readonly _items = signal<NoticeItem[]>([]);
  readonly items = this._items.asReadonly();
  private nextId = 1;

  info(message: string, duration = 3500) {
    return this.show(message, { variant: 'info', duration });
  }

  success(message: string, duration = 2500) {
    return this.show(message, { variant: 'success', duration });
  }

  error(message: string, duration = 5000) {
    return this.show(message, { variant: 'error', duration });
  }

  errorFrom(err: unknown, fallback = 'Request failed', duration = 5000) {
    return this.show(this.resolveErrorMessage(err, fallback), { variant: 'error', duration });
  }

  show(message: string, opts?: { variant?: NoticeVariant; duration?: number }) {
    const id = this.nextId++;
    const entry: NoticeItem = {
      id,
      message,
      variant: opts?.variant ?? 'info'
    };
    this._items.update((items) => [...items, entry]);
    const duration = opts?.duration ?? 3500;
    if (duration > 0) {
      window.setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  dismiss(id: number) {
    this._items.update((items) => items.filter((item) => item.id !== id));
  }

  private resolveErrorMessage(err: unknown, fallback: string): string {
    if (typeof err === 'string') return err;
    if (!err) return fallback;
    const anyErr = err as any;
    const errorBody = anyErr?.error;
    if (typeof errorBody === 'string') return errorBody;
    if (errorBody && typeof errorBody === 'object') {
      const detail = errorBody.detail;
      if (typeof detail === 'string') {
        const lowered = detail.toLowerCase();
        if (lowered.includes('token not valid') || lowered.includes('not valid for any token type')) {
          return 'Session expired. Please sign in again.';
        }
        return detail;
      }
      if (Array.isArray(detail)) return detail.join(', ');
      const fieldEntries = Object.entries(errorBody)
        .map(([key, value]) => {
          if (value === null || typeof value === 'undefined') return '';
          if (Array.isArray(value)) return `${key}: ${value.join(', ')}`;
          if (typeof value === 'object') return `${key}: ${JSON.stringify(value)}`;
          return `${key}: ${String(value)}`;
        })
        .filter(Boolean);
      if (fieldEntries.length) return fieldEntries.join(' | ');
    }
    if (typeof anyErr?.message === 'string') return anyErr.message;
    return fallback;
  }
}
