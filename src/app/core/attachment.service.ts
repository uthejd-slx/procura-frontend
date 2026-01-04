import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { Attachment, PaginatedResponse } from './types';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<Attachment>>(`${this.baseUrl}/attachments/`, {
      params: this.buildParams(params)
    });
  }

  upload(payload: { file: File; bom?: number; purchase_order?: number; bill?: number }) {
    const form = new FormData();
    form.append('file', payload.file);
    if (payload.bom) form.append('bom', String(payload.bom));
    if (payload.purchase_order) form.append('purchase_order', String(payload.purchase_order));
    if (payload.bill) form.append('bill', String(payload.bill));
    return this.http.post<Attachment>(`${this.baseUrl}/attachments/`, form);
  }

  delete(id: number) {
    return this.http.delete(`${this.baseUrl}/attachments/${id}/`);
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
