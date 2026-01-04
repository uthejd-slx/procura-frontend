import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { PaginatedResponse, PurchaseOrder, PurchaseOrderItem } from './types';

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<PurchaseOrder>>(`${this.baseUrl}/purchase-orders/`, {
      params: this.buildParams(params)
    });
  }

  get(id: number) {
    return this.http.get<PurchaseOrder>(`${this.baseUrl}/purchase-orders/${id}/`);
  }

  create(payload: Partial<PurchaseOrder>) {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/purchase-orders/`, payload);
  }

  update(id: number, payload: Partial<PurchaseOrder>) {
    return this.http.patch<PurchaseOrder>(`${this.baseUrl}/purchase-orders/${id}/`, payload);
  }

  addItem(id: number, payload: Partial<PurchaseOrderItem> & { name: string; quantity?: string }) {
    return this.http.post<PurchaseOrderItem>(`${this.baseUrl}/purchase-orders/${id}/items/`, payload);
  }

  markSent(id: number) {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/purchase-orders/${id}/mark-sent/`, {});
  }

  cancel(id: number) {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/purchase-orders/${id}/cancel/`, {});
  }

  receive(id: number, payload: { lines: { item_id: number; quantity_received: string }[]; comment?: string }) {
    return this.http.post(`${this.baseUrl}/purchase-orders/${id}/receive/`, payload);
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
