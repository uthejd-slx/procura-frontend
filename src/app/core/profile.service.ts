import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from './api-base-url';
import type { Profile } from './types';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getMe() {
    return this.http.get<Profile>(`${this.baseUrl}/profile/`);
  }

  updateMe(payload: Partial<Profile>) {
    return this.http.patch<Profile>(`${this.baseUrl}/profile/`, payload);
  }
}

