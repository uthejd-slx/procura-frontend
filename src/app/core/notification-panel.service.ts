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
}
