const API_BASE = '/api/v1';

// Token getter — set by AuthProvider
let tokenGetter: (() => string | null) | null = null;

export function setTokenGetter(getter: () => string | null) {
    tokenGetter = getter;
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = tokenGetter?.();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options?.headers as Record<string, string>) || {}),
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            // Token expired — trigger re-login
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }
        const text = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
