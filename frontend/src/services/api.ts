import { ApiError } from '../types';

export const ADMIN_TOKEN_KEY = 'pinglayer_admin_token';
export const API_KEY_KEY = 'pinglayer_api_key';

// Base URL from env or empty (for Vite proxy)
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getProductApiKey(): string | null {
  return sessionStorage.getItem(API_KEY_KEY);
}

export function setProductApiKey(key: string): void {
  sessionStorage.setItem(API_KEY_KEY, key);
}

export function clearProductApiKey(): void {
  sessionStorage.removeItem(API_KEY_KEY);
}

export function clearAllTokens(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(API_KEY_KEY);
}

export type AuthType = 'admin' | 'product' | 'none';

export async function request<T>(
  path: string,
  options: RequestInit = {},
  authType: AuthType = 'product'
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  let token: string | null = null;
  if (authType === 'admin') {
    token = getAdminToken();
  } else if (authType === 'product') {
    token = getProductApiKey();
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err?.message || 'Unable to connect to the PingLayer server. Please ensure the backend is running.',
      },
    } as ApiError;
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  let json: any = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { success: false, error: { code: 'PARSE_ERROR', message: text } };
    }
  }

  // Handle 401 Unauthorized globally: clear token and notify app to redirect
  if (res.status === 401) {
    clearAllTokens();
    window.dispatchEvent(new CustomEvent('pinglayer:unauthorized', { detail: { authType } }));
    const errorObj = json || {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Session expired or invalid token. Please log in again.' },
    };
    throw errorObj;
  }

  if (!res.ok) {
    const errorObj: ApiError = json?.error
      ? json
      : {
          success: false,
          error: {
            code: json?.error?.code || `HTTP_${res.status}`,
            message: json?.error?.message || res.statusText || 'An unexpected error occurred',
            details: json?.error?.details,
          },
        };
    throw errorObj;
  }

  // If backend wraps with { success: true, data: ... } or { success: true, ...paginated }
  return json;
}
