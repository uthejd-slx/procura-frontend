import { InjectionToken } from '@angular/core';

const API_BASE_PLACEHOLDER = '__API_BASE_URL__';
const FALLBACK_BASE = 'http://localhost:8001';

const resolveApiBase = (): string => {
  const raw = API_BASE_PLACEHOLDER;
  const base = raw && raw !== API_BASE_PLACEHOLDER ? raw : FALLBACK_BASE;
  const normalized = base.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => resolveApiBase()
});
