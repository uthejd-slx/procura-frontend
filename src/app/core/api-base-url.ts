import { InjectionToken } from '@angular/core';

type RuntimeConfig = {
  apiBaseUrl?: string;
  appVersion?: string;
};

const FALLBACK_BASE = 'http://localhost:8001';
const API_PLACEHOLDER = '__API_BASE_URL__';
const VERSION_PLACEHOLDER = '__APP_VERSION__';

const readRuntimeConfig = (): RuntimeConfig | null => {
  if (typeof window === 'undefined') return null;
  const config = (window as typeof window & { __APP_CONFIG__?: RuntimeConfig }).__APP_CONFIG__;
  return config ?? null;
};

const resolveApiBase = (): string => {
  const config = readRuntimeConfig();
  const raw = config?.apiBaseUrl && config.apiBaseUrl !== API_PLACEHOLDER ? config.apiBaseUrl : FALLBACK_BASE;
  const normalized = raw.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

export const resolveAppVersion = (): string => {
  const config = readRuntimeConfig();
  const raw = config?.appVersion && config.appVersion !== VERSION_PLACEHOLDER ? config.appVersion : '';
  return raw || 'dev';
};

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => resolveApiBase()
});
