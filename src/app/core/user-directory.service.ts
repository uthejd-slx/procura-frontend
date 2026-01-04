import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

import { API_BASE_URL } from './api-base-url';
import type { DirectoryUser } from './types';

@Injectable({ providedIn: 'root' })
export class UserDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private cache = new Map<string, Observable<DirectoryUser[]>>();

  list(): Observable<DirectoryUser[]> {
    const cached = this.cache.get('all');
    if (cached) return cached;

    const request$ = this.http
      .get<DirectoryUser[]>(`${this.baseUrl}/users/`)
      .pipe(shareReplay(1));
    this.cache.set('all', request$);
    return request$;
  }

  refresh(): void {
    this.cache.clear();
  }
}
