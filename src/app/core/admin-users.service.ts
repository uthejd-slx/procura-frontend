import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { DirectoryUser } from './types';

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  listUsers() {
    return this.http.get<DirectoryUser[]>(`${this.baseUrl}/users/`);
  }

  updateUser(id: number, payload: { roles?: string[]; is_active?: boolean }) {
    return this.http.patch(`${this.baseUrl}/admin/users/${id}/`, payload);
  }
}

