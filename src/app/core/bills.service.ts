import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { Bill, PaginatedResponse } from './types';

@Injectable({ providedIn: 'root' })
export class BillsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<Bill>>(`${this.baseUrl}/bills/`, {
      params: this.buildParams(params)
    });
  }

  get(id: number) {
    return this.http.get<Bill>(`${this.baseUrl}/bills/${id}/`);
  }

  create(payload: Partial<Bill>) {
    return this.http.post<Bill>(`${this.baseUrl}/bills/`, payload);
  }

  update(id: number, payload: Partial<Bill>) {
    return this.http.patch<Bill>(`${this.baseUrl}/bills/${id}/`, payload);
  }

  delete(id: number) {
    return this.http.delete(`${this.baseUrl}/bills/${id}/`);
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
