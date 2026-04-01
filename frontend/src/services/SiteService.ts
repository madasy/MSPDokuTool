import { apiFetch } from './apiClient';

export interface Site {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    country: string | null;
    tenantId: string;
    roomCount: number;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface CreateSiteRequest {
    name: string;
    address?: string;
    city?: string;
    country?: string;
    tenantId: string;
}

export interface Room {
    id: string;
    name: string;
    floor: string | null;
    description: string | null;
    siteId: string;
    rackCount: number;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface CreateRoomRequest {
    name: string;
    floor?: string;
    description?: string;
    siteId: string;
}

export const SiteService = {
    getByTenant: (tenantId: string) => apiFetch<Site[]>(`/sites?tenantId=${tenantId}`),
    get: (id: string) => apiFetch<Site>(`/sites/${id}`),
    create: (data: CreateSiteRequest) => apiFetch<Site>('/sites', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<void>(`/sites/${id}`, { method: 'DELETE' }),
};

export const RoomService = {
    getBySite: (siteId: string) => apiFetch<Room[]>(`/rooms?siteId=${siteId}`),
    get: (id: string) => apiFetch<Room>(`/rooms/${id}`),
    create: (data: CreateRoomRequest) => apiFetch<Room>('/rooms', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    delete: (id: string) => apiFetch<void>(`/rooms/${id}`, { method: 'DELETE' }),
};
