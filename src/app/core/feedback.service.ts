import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { Feedback, FeedbackCategory, PaginatedResponse } from './types';

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<Feedback>>(`${this.baseUrl}/feedback/`, {
      params: this.buildParams(params)
    });
  }

  create(payload: {
    category: FeedbackCategory;
    message: string;
    page_url?: string;
    rating?: number | null;
    metadata?: Record<string, unknown>;
  }) {
    return this.http.post<Feedback>(`${this.baseUrl}/feedback/`, payload);
  }

  update(id: number, payload: Partial<Pick<Feedback, 'status' | 'admin_note'>>) {
    return this.http.patch<Feedback>(`${this.baseUrl}/feedback/${id}/`, payload);
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
