export interface Subnet {
    id: string;
    cidr: string;
    description?: string;
    usedIps: number;
    totalIps: number;
    utilizationPercent: number;
}

export interface IpAddress {
    id: string;
    address: string;
    status: 'active' | 'reserved' | 'dhcp' | 'deprecated';
    hostname?: string;
    description?: string;
}

export interface CreateSubnetRequest {
    cidr: string;
    description?: string;
    tenantId: string;
}

const API_BASE_URL = 'http://localhost:8080/api/v1';

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
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
};
