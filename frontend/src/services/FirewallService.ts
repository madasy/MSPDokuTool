import { apiFetch } from './apiClient';

export interface FirewallInterface {
    id: string;
    deviceId: string;
    interfaceName: string;
    interfaceType: 'wan' | 'lan' | 'dmz' | 'ha' | 'mgmt' | string;
    zone: string | null;
    ipAddress: string | null;
    subnetMask: string | null;
    vlanId: number | null;
    dhcpEnabled: boolean;
    description: string | null;
    status: 'enabled' | 'disabled' | string;
}

export interface CreateFirewallInterfaceRequest {
    interfaceName: string;
    interfaceType: string;
    zone?: string;
    ipAddress?: string;
    subnetMask?: string;
    vlanId?: number;
    dhcpEnabled?: boolean;
    description?: string;
    status?: string;
}

export interface UpdateFirewallInterfaceRequest {
    interfaceType?: string;
    zone?: string;
    ipAddress?: string;
    subnetMask?: string;
    vlanId?: number;
    dhcpEnabled?: boolean;
    description?: string;
    status?: string;
}

export const FirewallService = {
    getInterfaces: (deviceId: string) =>
        apiFetch<FirewallInterface[]>(`/devices/${deviceId}/interfaces`),

    createInterface: (deviceId: string, request: CreateFirewallInterfaceRequest) =>
        apiFetch<FirewallInterface>(`/devices/${deviceId}/interfaces`, {
            method: 'POST',
            body: JSON.stringify(request),
        }),

    updateInterface: (deviceId: string, interfaceName: string, request: UpdateFirewallInterfaceRequest) =>
        apiFetch<FirewallInterface>(`/devices/${deviceId}/interfaces/${encodeURIComponent(interfaceName)}`, {
            method: 'PUT',
            body: JSON.stringify(request),
        }),

    deleteInterface: (deviceId: string, interfaceName: string) =>
        apiFetch<void>(`/devices/${deviceId}/interfaces/${encodeURIComponent(interfaceName)}`, {
            method: 'DELETE',
        }),
};
