export type TunnelType = 'IPSEC_S2S' | 'SSL_VPN' | 'WIREGUARD' | 'OTHER';
export type TunnelStatus = 'ACTIVE' | 'PLANNED' | 'DISABLED';
export type IkeVersion = 'IKEV1' | 'IKEV2';
export type EncryptionAlgorithm = 'AES_128' | 'AES_256' | 'TRIPLE_DES' | 'CHACHA20';
export type HashAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface SubnetRef {
    id: string;
    cidr: string;
}

export interface VpnTunnel {
    id: string;
    name: string;
    type: TunnelType;
    status: TunnelStatus;
    tenantId: string;
    tenantName: string;
    localDeviceId: string;
    localDeviceName: string;
    remoteDeviceId?: string;
    remoteDeviceName?: string;
    localSubnets: SubnetRef[];
    remoteSubnets: SubnetRef[];
    ikeVersion?: IkeVersion;
    encryption?: EncryptionAlgorithm;
    hash?: HashAlgorithm;
    dhGroup?: number;
    secretRef?: string;
}

export interface CreateVpnTunnelRequest {
    name: string;
    type: TunnelType;
    status?: TunnelStatus;
    tenantId: string;
    localDeviceId: string;
    remoteDeviceId?: string;
    localSubnetIds?: string[];
    remoteSubnetIds?: string[];
    ikeVersion?: IkeVersion;
    encryption?: EncryptionAlgorithm;
    hash?: HashAlgorithm;
    dhGroup?: number;
    secretRef?: string;
}

const API_BASE_URL = '/api/v1/vpn-tunnels';

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

export const VpnTunnelService = {
    getAll: () => apiFetch<VpnTunnel[]>(''),
    getByTenant: (tenantId: string) => apiFetch<VpnTunnel[]>(`?tenantId=${tenantId}`),
    create: (data: CreateVpnTunnelRequest) => apiFetch<VpnTunnel>('', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: CreateVpnTunnelRequest) =>
        apiFetch<VpnTunnel>(`/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/${id}`, { method: 'DELETE' }),
};
