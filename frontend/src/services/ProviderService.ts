import type { VpnTunnel } from './VpnTunnelService';

export type AssignableEntityType = 'vlans' | 'subnets' | 'ips' | 'devices';

export interface AssignmentResponse {
    id: string;
    assignedTenantId: string | null;
    assignedTenantName: string | null;
}

export interface ProvidedIp {
    id: string;
    address: string;
    usage?: string;
    subnetCidr: string;
    isPublic: boolean;
}

export interface ProvidedVlan {
    id: string;
    vlanTag: number;
    name?: string;
    ownerTenantName: string;
}

export interface ProvidedSubnet {
    id: string;
    cidr: string;
    description?: string;
    ownerTenantName: string;
}

export interface ProvidedDevice {
    id: string;
    name: string;
    model?: string;
    deviceType: string;
}

export interface ProvidedResources {
    publicIps: ProvidedIp[];
    vlans: ProvidedVlan[];
    subnets: ProvidedSubnet[];
    devices: ProvidedDevice[];
    vpnTunnels: VpnTunnel[];
}

const API_BASE_URL = '/api/v1';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} - ${text}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
}

export const ProviderService = {
    setAssignment: (entityType: AssignableEntityType, id: string, assignedTenantId: string | null) =>
        apiFetch<AssignmentResponse>(`/assignments/${entityType}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ assignedTenantId }),
        }),

    getProvidedResources: (tenantId: string) =>
        apiFetch<ProvidedResources>(`/tenants/${tenantId}/provided-resources`),
};
