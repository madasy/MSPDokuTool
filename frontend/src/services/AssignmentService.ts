import { apiFetch } from './apiClient';
import type { VpnTunnel } from './VpnTunnelService';

export type AssignableEntityType = 'vlans' | 'subnets' | 'devices';

export interface AssignmentResponse {
    id: string;
    assignedTenantId: string | null;
    assignedTenantName: string | null;
}

export interface ProvidedPublicIp {
    id: string;
    ipAddress: string;
    usage?: string;
    rangeCidr: string;
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
    publicIps: ProvidedPublicIp[];
    vlans: ProvidedVlan[];
    subnets: ProvidedSubnet[];
    devices: ProvidedDevice[];
    vpnTunnels: VpnTunnel[];
}

export const AssignmentService = {
    setAssignment: (entityType: AssignableEntityType, id: string, assignedTenantId: string | null) =>
        apiFetch<AssignmentResponse>(`/assignments/${entityType}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ assignedTenantId }),
        }),

    getProvidedResources: (tenantId: string) =>
        apiFetch<ProvidedResources>(`/tenants/${tenantId}/provided-resources`),
};
