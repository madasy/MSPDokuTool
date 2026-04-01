import { apiFetch } from './apiClient';

export interface AutheliaUser {
    username: string;
    displayname: string;
    email: string;
    groups: string[];
}

export interface CreateUserRequest {
    username: string;
    displayname: string;
    email: string;
    password: string;
    groups: string[];
}

export const UserService = {
    getAll: () => apiFetch<AutheliaUser[]>('/users'),
    getByTenant: (tenantIdentifier: string) => apiFetch<AutheliaUser[]>(`/users/tenant/${tenantIdentifier}`),
    create: (data: CreateUserRequest) => apiFetch<AutheliaUser>('/users', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    delete: (username: string) => apiFetch<void>(`/users/${username}`, { method: 'DELETE' }),
    resetPassword: (username: string, password: string) => apiFetch<void>(`/users/${username}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
    }),
    resetTotp: (username: string) => apiFetch<void>(`/users/${username}/reset-totp`, { method: 'POST' }),
};
