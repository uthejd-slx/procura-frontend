import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { PaginatedResponse, Transfer, TransferItem } from './types';

@Injectable({ providedIn: 'root' })
export class TransfersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<Transfer>>(`${this.baseUrl}/transfers/`, {
      params: this.buildParams(params)
    });
  }

  get(id: number) {
    return this.http.get<Transfer>(`${this.baseUrl}/transfers/${id}/`);
  }

  create(payload: { partner: number; notes?: string }) {
    return this.http.post<Transfer>(`${this.baseUrl}/transfers/`, payload);
  }

  update(id: number, payload: Partial<Transfer>) {
    return this.http.patch<Transfer>(`${this.baseUrl}/transfers/${id}/`, payload);
  }

  addItem(id: number, payload: { asset: number; quantity: string; notes?: string }) {
    return this.http.post<TransferItem>(`${this.baseUrl}/transfers/${id}/items/`, payload);
  }

  submit(id: number) {
    return this.http.post<Transfer>(`${this.baseUrl}/transfers/${id}/submit/`, {});
  }

  approve(id: number) {
    return this.http.post<Transfer>(`${this.baseUrl}/transfers/${id}/approve/`, {});
  }

  complete(id: number) {
    return this.http.post<Transfer>(`${this.baseUrl}/transfers/${id}/complete/`, {});
  }

  cancel(id: number) {
    return this.http.post<Transfer>(`${this.baseUrl}/transfers/${id}/cancel/`, {});
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
