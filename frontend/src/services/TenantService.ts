import { apiFetch } from './apiClient';

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

export interface TenantSummary {
    deviceCount: number;
    devicesByType: Record<string, number>;
    subnetCount: number;
    ipUtilization: number;
    rackCount: number;
}

export const TenantService = {
    getAll: () => apiFetch<Tenant[]>('/tenants'),
    create: (data: CreateTenantRequest) => apiFetch<Tenant>('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    getSummary: (tenantId: string) => apiFetch<TenantSummary>(`/tenants/${tenantId}/summary`),
};
