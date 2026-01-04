import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { CatalogItem, PaginatedResponse } from './types';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<CatalogItem>>(`${this.baseUrl}/catalog-items/`, {
      params: this.buildParams(params)
    });
  }

  create(payload: Partial<CatalogItem>) {
    return this.http.post<CatalogItem>(`${this.baseUrl}/catalog-items/`, payload);
  }

  update(id: number, payload: Partial<CatalogItem>) {
    return this.http.patch<CatalogItem>(`${this.baseUrl}/catalog-items/${id}/`, payload);
  }

  delete(id: number) {
    return this.http.delete(`${this.baseUrl}/catalog-items/${id}/`);
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
