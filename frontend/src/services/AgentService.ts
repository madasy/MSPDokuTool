import { apiFetch } from './apiClient';

export interface AgentReport {
    id: string;
    tenantId: string;
    hostname: string;
    osName: string | null;
    osVersion: string | null;
    kernel: string | null;
    cpuModel: string | null;
    cpuCores: number | null;
    ramTotalMb: number | null;
    ramUsedMb: number | null;
    diskTotalGb: number | null;
    diskUsedGb: number | null;
    uptimeSeconds: number | null;
    ipAddresses: string[];
    macAddresses: string[];
    pendingUpdates: number | null;
    avStatus: string | null;
    domainJoined: boolean | null;
    domainName: string | null;
    agentVersion: string | null;
    reportedAt: string;
    linkedDeviceId: string | null;
    linkedDeviceName: string | null;
}

export interface AgentKey {
    id: string;
    name: string;
    tenantId: string;
    isActive: boolean;
    lastUsed: string | null;
    createdAt: string | null;
}

export interface CreateKeyResponse {
    id: string;
    name: string;
    apiKey: string;
}

export const AgentService = {
    getReports: (tenantId: string) => apiFetch<AgentReport[]>(`/agent/reports?tenantId=${tenantId}`),
    getKeys: (tenantId: string) => apiFetch<AgentKey[]>(`/agent/keys?tenantId=${tenantId}`),
    createKey: (data: { name: string; tenantId: string }) =>
        apiFetch<CreateKeyResponse>('/agent/keys', { method: 'POST', body: JSON.stringify(data) }),
    deleteKey: (id: string) => apiFetch<void>(`/agent/keys/${id}`, { method: 'DELETE' }),
};
