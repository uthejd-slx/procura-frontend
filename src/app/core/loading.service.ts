import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _count = signal(0);
  readonly isLoading = computed(() => this._count() > 0);

  start(): void {
    this._count.update((count) => count + 1);
  }

  stop(): void {
    this._count.update((count) => (count > 0 ? count - 1 : 0));
  }

  reset(): void {
    this._count.set(0);
  }
}
