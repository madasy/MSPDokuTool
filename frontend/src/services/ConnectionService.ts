import { apiFetch } from './apiClient';

export interface DeviceInterface {
    id: string;
    deviceId: string;
    deviceName: string;
    name: string;
    macAddress: string | null;
    type: string | null;
    description: string | null;
}

export interface DeviceConnection {
    id: string;
    endpointA: DeviceInterface;
    endpointB: DeviceInterface;
    cableType: string | null;
    status: string;
}

export interface DeviceConnectionSummary {
    deviceId: string;
    deviceName: string;
    interfaces: DeviceInterface[];
    connections: DeviceConnection[];
}

export const ConnectionService = {
    getDeviceConnections: (deviceId: string) =>
        apiFetch<DeviceConnectionSummary>(`/devices/${deviceId}/connections`),
    getInterfaces: (deviceId: string) =>
        apiFetch<DeviceInterface[]>(`/devices/${deviceId}/ports-interfaces`),
    createInterface: (data: { deviceId: string; name: string; macAddress?: string; type?: string; description?: string }) =>
        apiFetch<DeviceInterface>('/port-interfaces', { method: 'POST', body: JSON.stringify(data) }),
    deleteInterface: (id: string) =>
        apiFetch<void>(`/port-interfaces/${id}`, { method: 'DELETE' }),
    getConnections: (tenantId: string) =>
        apiFetch<DeviceConnection[]>(`/connections?tenantId=${tenantId}`),
    createConnection: (data: { endpointAId: string; endpointBId: string; cableType?: string }) =>
        apiFetch<DeviceConnection>('/connections', { method: 'POST', body: JSON.stringify(data) }),
    deleteConnection: (id: string) =>
        apiFetch<void>(`/connections/${id}`, { method: 'DELETE' }),
};
