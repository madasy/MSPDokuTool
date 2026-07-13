import { apiFetch } from './apiClient';

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

export const VpnTunnelService = {
    getAll: () => apiFetch<VpnTunnel[]>('/vpn-tunnels'),
    getByTenant: (tenantId: string) => apiFetch<VpnTunnel[]>(`/vpn-tunnels?tenantId=${tenantId}`),
    create: (data: CreateVpnTunnelRequest) => apiFetch<VpnTunnel>('/vpn-tunnels', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    update: (id: string, data: CreateVpnTunnelRequest) =>
        apiFetch<VpnTunnel>(`/vpn-tunnels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/vpn-tunnels/${id}`, { method: 'DELETE' }),
};
