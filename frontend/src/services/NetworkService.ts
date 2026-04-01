import { apiFetch } from './apiClient';

export interface Subnet {
    id: string;
    cidr: string;
    description?: string;
    vlanId?: string;
    vlanTag?: number;
    vlanName?: string;
    gateway?: string;
    usedIps: number;
    totalIps: number;
    utilizationPercent: number;
}

export interface IpAddress {
    id: string;
    address: string;
    status: 'active' | 'reserved' | 'dhcp' | 'manual' | 'free';
    hostname?: string;
    description?: string;
    mac?: string;
}

export interface CreateSubnetRequest {
    cidr: string;
    description?: string;
    gateway?: string;
    vlanId?: string;
    vlanTag?: number;
    vlanName?: string;
    tenantId: string;
}

export interface CreateIpAddressRequest {
    subnetId: string;
    address: string;
    status?: string;
    hostname?: string;
    description?: string;
    mac?: string;
}

export interface UpdateIpAddressRequest {
    status?: string;
    hostname?: string;
    description?: string;
    mac?: string;
}

export const NetworkService = {
    getSubnets: (tenantId: string) => apiFetch<Subnet[]>(`/network/subnets?tenantId=${tenantId}`),

    createSubnet: (data: CreateSubnetRequest) => apiFetch<Subnet>('/network/subnets', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    getIps: (subnetId: string) => apiFetch<IpAddress[]>(`/network/subnets/${subnetId}/ips`),

    createIp: (data: CreateIpAddressRequest) => apiFetch<IpAddress>('/network/ips', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    updateIp: (id: string, data: UpdateIpAddressRequest) => apiFetch<IpAddress>(`/network/ips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    deleteIp: (id: string) => apiFetch<void>(`/network/ips/${id}`, {
        method: 'DELETE',
    }),
};
