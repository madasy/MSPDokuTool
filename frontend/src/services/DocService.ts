export type DocEntityType =
    | 'TENANT' | 'SITE' | 'ROOM' | 'RACK' | 'DEVICE'
    | 'VLAN' | 'SUBNET' | 'IP_ADDRESS' | 'VPN_TUNNEL';

export type FieldType = 'TEXT' | 'NUMBER' | 'URL' | 'DATE';

export interface Note {
    id: string;
    title: string;
    contentMarkdown: string;
    entityType: DocEntityType;
    entityId: string;
    updatedAt?: string;
}

export interface CustomField {
    id: string;
    name: string;
    value: string;
    fieldType: FieldType;
    entityType: DocEntityType;
    entityId: string;
}

const API_BASE_URL = '/api/v1';

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

export const DocService = {
    getNotes: (entityType: DocEntityType, entityId: string) =>
        apiFetch<Note[]>(`/notes?entityType=${entityType}&entityId=${entityId}`),
    createNote: (data: { title: string; contentMarkdown: string; entityType: DocEntityType; entityId: string }) =>
        apiFetch<Note>('/notes', { method: 'POST', body: JSON.stringify(data) }),
    updateNote: (id: string, data: { title: string; contentMarkdown: string }) =>
        apiFetch<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteNote: (id: string) => apiFetch<void>(`/notes/${id}`, { method: 'DELETE' }),

    getCustomFields: (entityType: DocEntityType, entityId: string) =>
        apiFetch<CustomField[]>(`/custom-fields?entityType=${entityType}&entityId=${entityId}`),
    createCustomField: (data: { name: string; value: string; fieldType?: FieldType; entityType: DocEntityType; entityId: string }) =>
        apiFetch<CustomField>('/custom-fields', { method: 'POST', body: JSON.stringify(data) }),
    updateCustomField: (id: string, data: { value: string; fieldType?: FieldType }) =>
        apiFetch<CustomField>(`/custom-fields/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCustomField: (id: string) => apiFetch<void>(`/custom-fields/${id}`, { method: 'DELETE' }),
};
