const API_BASE = '/api/v1';

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}
