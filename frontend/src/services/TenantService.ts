export interface Tenant {
    id: string;
    name: string;
    identifier: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateTenantRequest {
    name: string;
    identifier: string;
}

const API_BASE_URL = 'http://localhost:8080/api/v1';

// Basic fetch wrapper handles Token later
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer ...' // TODO: Add auth token
            ...options?.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

export const TenantService = {
    getAll: () => apiFetch<Tenant[]>('/tenants'),
    create: (data: CreateTenantRequest) => apiFetch<Tenant>('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};
