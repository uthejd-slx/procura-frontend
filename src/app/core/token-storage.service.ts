import { Injectable, signal } from '@angular/core';

const ACCESS_KEY = 'auth.access';
const REFRESH_KEY = 'auth.refresh';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly _accessToken = signal<string | null>(localStorage.getItem(ACCESS_KEY));
  private readonly _refreshToken = signal<string | null>(localStorage.getItem(REFRESH_KEY));

  readonly accessToken = this._accessToken.asReadonly();
  readonly refreshToken = this._refreshToken.asReadonly();

  getAccessToken(): string | null {
    return this._accessToken();
  }

  getRefreshToken(): string | null {
    return this._refreshToken();
  }

  setAccessToken(access: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    this._accessToken.set(access);
  }

  setRefreshToken(refresh: string): void {
    localStorage.setItem(REFRESH_KEY, refresh);
    this._refreshToken.set(refresh);
  }

  setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    this._accessToken.set(access);
    this._refreshToken.set(refresh);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this._accessToken.set(null);
    this._refreshToken.set(null);
  }
}
