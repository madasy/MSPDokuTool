import { apiFetch } from './apiClient';

export interface AccessPoint {
    id: string;
    siteId: string;
    siteName: string;
    name: string;
    model: string | null;
    macAddress: string | null;
    ipAddress: string | null;
    locationDescription: string | null;
    floor: string | null;
    room: string | null;
    mountType: string;
    status: string;
    channel: string | null;
    ssids: string[];
    createdAt: string | null;
    updatedAt: string | null;
}

export interface CreateAccessPointRequest {
    siteId: string;
    name: string;
    model?: string;
    macAddress?: string;
    ipAddress?: string;
    locationDescription?: string;
    floor?: string;
    room?: string;
    mountType?: string;
    status?: string;
    channel?: string;
    ssids?: string[];
}

export const AccessPointService = {
    getByTenant: (tenantId: string) => apiFetch<AccessPoint[]>(`/access-points?tenantId=${tenantId}`),
    create: (data: CreateAccessPointRequest) => apiFetch<AccessPoint>('/access-points', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<void>(`/access-points/${id}`, { method: 'DELETE' }),
};
