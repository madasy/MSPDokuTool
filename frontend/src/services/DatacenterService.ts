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

export interface IpAssignment {
    id: string;
    ipAddress: string;
    assignedTenantId: string | null;
    assignedTenantName: string | null;
    assignedDeviceId: string | null;
    assignedDeviceName: string | null;
    description: string | null;
    status: 'free' | 'assigned' | 'reserved' | 'network' | 'broadcast';
}

export interface UpdateAssignmentRequest {
    assignedTenantId?: string;
    assignedDeviceId?: string;
    description?: string;
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

    getAssignments: (rangeId: string) => apiFetch<IpAssignment[]>(`/datacenter/ip-ranges/${rangeId}/assignments`),

    generateIps: (rangeId: string) => apiFetch<IpAssignment[]>(`/datacenter/ip-ranges/${rangeId}/generate`, { method: 'POST' }),

    updateAssignment: (rangeId: string, ipAddress: string, data: UpdateAssignmentRequest) =>
        apiFetch<IpAssignment>(`/datacenter/ip-ranges/${rangeId}/assignments/${encodeURIComponent(ipAddress)}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};
