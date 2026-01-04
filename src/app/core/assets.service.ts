import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { Asset, PaginatedResponse } from './types';

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<Asset>>(`${this.baseUrl}/assets/`, {
      params: this.buildParams(params)
    });
  }

  get(id: number) {
    return this.http.get<Asset>(`${this.baseUrl}/assets/${id}/`);
  }

  update(id: number, payload: Partial<Asset>) {
    return this.http.patch<Asset>(`${this.baseUrl}/assets/${id}/`, payload);
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
