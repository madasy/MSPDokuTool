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
    // Note: Backend DTO does not include 'ips' list directly in getSubnets.
    // We fetch IPs separately or need to update backend. For now, let's fetch separately in the UI component.
}

export interface IpAddress {
    id: string;
    address: string;
    status: 'active' | 'reserved' | 'dhcp' | 'manual' | 'free'; // Updated to match backend/frontend logic
    hostname?: string;
    description?: string;
    mac?: string;
}

export interface CreateSubnetRequest {
    cidr: string;
    description?: string;
    gateway?: string;
    vlanId?: string; // UUID
    vlanTag?: number;
    vlanName?: string;
    tenantId: string;
}

export interface CreateIpAddressRequest {
    subnetId: string; // UUID
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

const API_BASE_URL = 'http://localhost:8080/api/v1';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer placeholder-token', // Add generic token placeholder for now
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
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
