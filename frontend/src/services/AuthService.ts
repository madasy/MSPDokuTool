const API_BASE = '/api/v1/auth';

export interface AuthUser {
    id: string;
    email: string;
    displayName: string | null;
    role: 'ADMIN' | 'TECHNICIAN' | 'TENANT_USER';
    tenantId: string | null;
    totpEnabled: boolean;
    totpRequired: boolean;
}

export interface LoginResponse {
    token: string | null;
    pendingToken: string | null;
    requiresTotp: boolean;
    user: AuthUser | null;
}

export interface AuthConfig {
    setupRequired: boolean;
}

export interface TotpSetupResponse {
    secret: string;
    qrCodeUri: string;
}

async function authFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...((options?.headers as Record<string, string>) || {}) },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
}

export const AuthServiceApi = {
    getConfig: () => authFetch<AuthConfig>('/config'),
    setup: (data: { email: string; displayName: string; password: string }) =>
        authFetch<LoginResponse>('/setup', { method: 'POST', body: JSON.stringify(data) }),
    login: (email: string, password: string) =>
        authFetch<LoginResponse>('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    verifyTotp: (pendingToken: string, code: string) =>
        authFetch<LoginResponse>('/totp/verify', { method: 'POST', body: JSON.stringify({ pendingToken, code }) }),
    setupTotp: (token: string) =>
        authFetch<TotpSetupResponse>('/me/totp/setup', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }),
    confirmTotp: (token: string, code: string) =>
        authFetch<void>('/me/totp/confirm', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) }),
};
