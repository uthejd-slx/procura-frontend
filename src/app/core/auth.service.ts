import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';

import { API_BASE_URL } from './api-base-url';
import type { ApiUser, TokenResponse } from './types';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly _user = signal<ApiUser | null>(null);
  readonly user$ = this._user.asReadonly();

  hasRole(role: string): boolean {
    const user = this._user();
    if (!user) return false;
    if (role === 'employee') return true;
    return (user.roles || []).includes(role);
  }

  isAuthenticated(): boolean {
    return !!this.tokenStorage.accessToken();
  }

  loadMe() {
    return this.http.get<ApiUser>(`${this.baseUrl}/auth/me/`).pipe(
      tap((user) => this._user.set(user)),
      catchError(() => {
        this._user.set(null);
        return of(null);
      })
    );
  }

  register(payload: { email: string; password: string; first_name?: string; last_name?: string }) {
    return this.http.post(`${this.baseUrl}/auth/register/`, payload);
  }

  login(email: string, password: string) {
    return this.http.post<TokenResponse>(`${this.baseUrl}/auth/login/`, { email, password }).pipe(
      tap((resp) => this.tokenStorage.setTokens(resp.access, resp.refresh)),
      tap((resp) => {
        if (resp.user) this._user.set(resp.user);
      }),
      tap(() => this.router.navigateByUrl('/'))
    );
  }

  logout(): void {
    this.tokenStorage.clear();
    this._user.set(null);
    this.router.navigateByUrl('/login');
  }

  activate(uid: string, token: string) {
    return this.http.get(`${this.baseUrl}/auth/activate/`, { params: { uid, token } });
  }

  requestPasswordReset(email: string) {
    return this.http.post(`${this.baseUrl}/auth/password-reset/`, { email });
  }

  validateReset(uid: string, token: string) {
    return this.http.get(`${this.baseUrl}/auth/password-reset/confirm/`, { params: { uid, token } });
  }

  confirmReset(uid: string, token: string, newPassword: string) {
    return this.http.post(`${this.baseUrl}/auth/password-reset/confirm/`, {
      uid,
      token,
      new_password: newPassword
    });
  }
}
