import { apiFetch } from './apiClient';

export interface SwitchPort {
    id: string;
    portNumber: number;
    portName: string | null;
    status: 'up' | 'down' | 'disabled';
    mode: 'access' | 'trunk';
    accessVlanId: number | null;
    taggedVlans: number[];
    speed: string | null;
    connectedDevice: string | null;
    description: string | null;
}

export interface UpdateSwitchPortRequest {
    status?: string;
    mode?: string;
    accessVlanId?: number;
    taggedVlans?: number[];
    speed?: string;
    connectedDevice?: string;
    description?: string;
}

export const SwitchPortService = {
    getPorts: (deviceId: string) => apiFetch<SwitchPort[]>(`/devices/${deviceId}/ports`),
    initializePorts: (deviceId: string, portCount = 48) =>
        apiFetch<SwitchPort[]>(`/devices/${deviceId}/ports/initialize`, {
            method: 'POST',
            body: JSON.stringify({ portCount }),
        }),
    updatePort: (deviceId: string, portNumber: number, data: UpdateSwitchPortRequest) =>
        apiFetch<SwitchPort>(`/devices/${deviceId}/ports/${portNumber}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};
