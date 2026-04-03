import { apiFetch } from './apiClient';

export interface UserInfo {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    tenantId: string | null;
    tenantName: string | null;
    totpEnabled: boolean;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string | null;
}

export interface CreateUserRequest {
    email: string;
    displayName?: string;
    password: string;
    role: string;
    tenantId?: string;
}

export const UserService = {
    getAll: () => apiFetch<UserInfo[]>('/users'),
    create: (data: CreateUserRequest) => apiFetch<UserInfo>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateUserRequest>) => apiFetch<UserInfo>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<void>(`/users/${id}`, { method: 'DELETE' }),
    resetPassword: (id: string, newPassword: string) => apiFetch<void>(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
    resetTotp: (id: string) => apiFetch<void>(`/users/${id}/reset-totp`, { method: 'POST' }),
};
