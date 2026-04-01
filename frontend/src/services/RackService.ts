import { apiFetch } from './apiClient';

export interface Rack {
    id: string;
    name: string;
    heightUnits: number;
    devices: RackDevice[];
}

export interface RackDevice {
    id: string;
    name: string;
    deviceType: 'SERVER' | 'SWITCH' | 'ROUTER' | 'FIREWALL' | 'PATCHPANEL' | 'PDU' | 'WIFI_AP' | 'OTHER';
    status: 'ACTIVE' | 'PLANNED' | 'STORAGE' | 'RETIRED';
    positionU?: number;
    heightU: number;
    serialNumber?: string;
    ip?: string;
    model?: string;
}

// Alias for backward compatibility with RackVisualization component
export type Device = RackDevice;

export const RackService = {
    getByTenant: (tenantId: string) => apiFetch<Rack[]>(`/racks?tenantId=${tenantId}`),
    get: (id: string) => apiFetch<Rack>(`/racks/${id}`),
};
