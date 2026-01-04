import { InjectionToken } from '@angular/core';

type RuntimeConfig = {
  apiBaseUrl?: string;
};

const FALLBACK_BASE = 'http://localhost:8001';

const readRuntimeConfig = (): string | null => {
  if (typeof window === 'undefined') return null;
  const config = (window as typeof window & { __APP_CONFIG__?: RuntimeConfig }).__APP_CONFIG__;
  return config?.apiBaseUrl ?? null;
};

const resolveApiBase = (): string => {
  const raw = readRuntimeConfig() || FALLBACK_BASE;
  const normalized = raw.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => resolveApiBase()
});
