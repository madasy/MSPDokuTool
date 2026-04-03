import { apiFetch } from './apiClient';

export interface Tenant {
    id: string;
    name: string;
    identifier: string;
    createdAt?: string;
    updatedAt?: string;
    profile?: string;
    hiddenModules?: string[];
    showAdvancedFields?: boolean;
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

export interface TenantHealth {
    overallScore: number;
    overallLevel: string;
    categories: CategoryScore[];
    actions: ActionItem[];
}

export interface CategoryScore {
    category: string;
    score: number;
    color: string;
}

export interface ActionItem {
    severity: 'critical' | 'warning' | 'info' | 'ok';
    title: string;
    description: string;
    link?: string;
}

export const TenantService = {
    getAll: () => apiFetch<Tenant[]>('/tenants'),
    create: (data: CreateTenantRequest) => apiFetch<Tenant>('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id: string, data: { name?: string; profile?: string; hiddenModules?: string[]; showAdvancedFields?: boolean }) =>
        apiFetch<Tenant>(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getSummary: (tenantId: string) => apiFetch<TenantSummary>(`/tenants/${tenantId}/summary`),
    getHealth: (tenantId: string) => apiFetch<TenantHealth>(`/tenants/${tenantId}/health`),
};
