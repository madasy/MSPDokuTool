import { apiFetch } from './apiClient';

export interface DashboardStats {
    tenantCount: number;
    totalDevices: number;
    totalSubnets: number;
    totalIpAddresses: number;
}

export interface ActivityEntry {
    type: 'device' | 'subnet' | 'ip_address';
    name: string;
    tenantName: string | null;
    action: 'created' | 'updated';
    timestamp: string;
}

export const DashboardService = {
    getStats: () => apiFetch<DashboardStats>('/dashboard/stats'),
    getActivity: (limit = 20) => apiFetch<ActivityEntry[]>(`/dashboard/activity?limit=${limit}`),
};
