import { apiFetch } from './apiClient';

export interface PublicIpRange {
    id: string;
    cidr: string;
    description: string | null;
    assignedTenantId: string | null;
    assignedTenantName: string | null;
    provider: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePublicIpRangeRequest {
    cidr: string;
    description?: string;
    assignedTenantId?: string;
    provider?: string;
    status?: string;
}

export const DatacenterService = {
    getAll: () => apiFetch<PublicIpRange[]>('/datacenter/ip-ranges'),

    create: (data: CreatePublicIpRangeRequest) => apiFetch<PublicIpRange>('/datacenter/ip-ranges', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    update: (id: string, data: Partial<CreatePublicIpRangeRequest>) =>
        apiFetch<PublicIpRange>(`/datacenter/ip-ranges/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) => apiFetch<void>(`/datacenter/ip-ranges/${id}`, {
        method: 'DELETE',
    }),
};
