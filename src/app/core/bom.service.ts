import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { Bom, BomCollaborator, BomEvent, BomItem, BomTemplate, PaginatedResponse, ProcurementApproval } from './types';

@Injectable({ providedIn: 'root' })
export class BomService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  // Templates
  listTemplates(params?: Record<string, string | number | boolean>) {
    const httpParams = params
      ? new HttpParams({
          fromObject: Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)]))
        })
      : undefined;
    return this.http.get<BomTemplate[] | PaginatedResponse<BomTemplate>>(`${this.baseUrl}/bom-templates/`, {
      params: httpParams
    });
  }

  createTemplate(payload: { name: string; description?: string; schema?: any }) {
    return this.http.post<BomTemplate>(`${this.baseUrl}/bom-templates/`, payload);
  }

  updateTemplate(id: number, payload: Partial<Pick<BomTemplate, 'name' | 'description' | 'schema'>>) {
    return this.http.patch<BomTemplate>(`${this.baseUrl}/bom-templates/${id}/`, payload);
  }

  deleteTemplate(id: number) {
    return this.http.delete(`${this.baseUrl}/bom-templates/${id}/`);
  }

  // BOMs
  listBoms(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<Bom>>(`${this.baseUrl}/boms/`, {
      params: this.buildParams(params)
    });
  }

  getBom(id: number) {
    return this.http.get<Bom>(`${this.baseUrl}/boms/${id}/`);
  }

  createBom(payload: { template?: number | null; title: string; project?: string; data?: any }) {
    return this.http.post<Bom>(`${this.baseUrl}/boms/`, payload, { observe: 'response' });
  }

  updateBom(id: number, payload: Partial<Pick<Bom, 'title' | 'project' | 'data' | 'template'>>) {
    return this.http.patch<Bom>(`${this.baseUrl}/boms/${id}/`, payload);
  }

  deleteBom(id: number) {
    return this.http.delete(`${this.baseUrl}/boms/${id}/`);
  }

  addItem(bomId: number, payload: Partial<BomItem> & { name: string }) {
    return this.http.post<BomItem>(`${this.baseUrl}/boms/${bomId}/items/`, payload);
  }

  updateItem(itemId: number, payload: Partial<BomItem> & { name?: string }) {
    return this.http.patch<BomItem>(`${this.baseUrl}/bom-items/${itemId}/`, payload);
  }

  deleteItem(itemId: number) {
    return this.http.delete(`${this.baseUrl}/bom-items/${itemId}/`);
  }

  requestSignoff(bomId: number, payload: { assignee_id: number; item_ids?: number[]; comment?: string }) {
    return this.http.post(`${this.baseUrl}/boms/${bomId}/request-signoff/`, payload);
  }

  requestProcurementApproval(bomId: number, payload: { approver_ids: number[]; comment?: string }) {
    return this.http.post(`${this.baseUrl}/boms/${bomId}/request-procurement-approval/`, payload);
  }

  cancelFlow(bomId: number, payload: { comment?: string }) {
    return this.http.post(`${this.baseUrl}/boms/${bomId}/cancel/`, payload);
  }

  // Events
  listEvents(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<BomEvent>>(`${this.baseUrl}/bom-events/`, {
      params: this.buildParams(params)
    });
  }

  // Inboxes
  listBomItems(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<BomItem>>(`${this.baseUrl}/bom-items/`, {
      params: this.buildParams(params)
    });
  }

  decideSignoff(itemId: number, payload: { status: 'APPROVED' | 'NEEDS_CHANGES'; comment?: string }) {
    return this.http.post(`${this.baseUrl}/bom-items/${itemId}/signoff/`, payload);
  }

  listProcurementApprovals(params?: Record<string, string | number | boolean | string[] | null | undefined>) {
    return this.http.get<PaginatedResponse<ProcurementApproval>>(`${this.baseUrl}/procurement-approvals/`, {
      params: this.buildParams(params)
    });
  }

  decideProcurementApproval(approvalId: number, payload: { status: 'APPROVED' | 'NEEDS_CHANGES'; comment?: string }) {
    return this.http.post(`${this.baseUrl}/procurement-approvals/${approvalId}/decide/`, payload);
  }

  // Procurement actions
  markOrdered(bomId: number, payload: { item_ids?: number[]; eta_date?: string; comment?: string } = {}) {
    return this.http.post(`${this.baseUrl}/procurement-actions/${bomId}/mark-ordered/`, payload);
  }

  receive(bomId: number, payload: { lines: { item_id: number; quantity_received: string }[]; comment?: string }) {
    return this.http.post(`${this.baseUrl}/procurement-actions/${bomId}/receive/`, payload);
  }

  // Collaborators
  listCollaborators(bomId: number) {
    return this.http.get<BomCollaborator[]>(`${this.baseUrl}/boms/${bomId}/collaborators/`);
  }

  addCollaborator(bomId: number, payload: { user_id: number }) {
    return this.http.post<BomCollaborator>(`${this.baseUrl}/boms/${bomId}/collaborators/`, payload);
  }

  removeCollaborator(bomId: number, userId: number) {
    return this.http.delete(`${this.baseUrl}/boms/${bomId}/collaborators/${userId}/`);
  }

  // Export
  exportBom(bomId: number, format: 'pdf' | 'csv' | 'json') {
    return this.http.get(`${this.baseUrl}/boms/${bomId}/export/`, {
      params: this.buildParams({ format }),
      observe: 'response',
      responseType: 'blob'
    });
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
