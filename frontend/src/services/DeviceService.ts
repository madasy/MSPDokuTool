import { apiFetch } from './apiClient';

export interface Device {
    id: string;
    name: string;
    deviceType: string;
    model?: string;
    serial?: string;
    ip?: string;
    mac?: string;
    status: 'ACTIVE' | 'PLANNED' | 'STORAGE' | 'RETIRED';
    rackId?: string;
    rackName?: string;
    positionU?: number;
    heightU: number;
    rj45Ports?: number;
    sfpPorts?: number;
}

export type CreateDeviceRequest = Omit<Device, 'id' | 'rackName'>;

export const DeviceService = {
    getAll: (tenantId?: string) =>
        apiFetch<Device[]>(tenantId ? `/devices?tenantId=${tenantId}` : '/devices'),

    getById: (id: string) => apiFetch<Device>(`/devices/${id}`),

    create: (device: CreateDeviceRequest) => apiFetch<Device>('/devices', {
        method: 'POST',
        body: JSON.stringify(device),
    }),

    update: (id: string, device: Partial<CreateDeviceRequest>) => apiFetch<Device>(`/devices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(device),
    }),

    delete: (id: string) => apiFetch<void>(`/devices/${id}`, {
        method: 'DELETE',
    }),
};
