// Base URL for API
const API_BASE_URL = '/api/v1/devices';

export interface Device {
    id: string;
    name: string;
    deviceType: string;
    model?: string;
    serial?: string;
    ip?: string;
    mac?: string;
    status: 'ACTIVE' | 'PLANNED' | 'STORAGE' | 'RETIRED';
    rackId?: string;
    rackName?: string;
    positionU?: number;
    heightU: number;
}

export type CreateDeviceRequest = Omit<Device, 'id' | 'rackName'>;

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

    // specific hack: for DELETE (204 No Content), calling .json() might fail.
    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

export const DeviceService = {
    getAll: async (): Promise<Device[]> => {
        return apiFetch<Device[]>('');
    },

    getById: async (id: string): Promise<Device> => {
        return apiFetch<Device>(`/${id}`);
    },

    create: async (device: CreateDeviceRequest): Promise<Device> => {
        return apiFetch<Device>('', {
            method: 'POST',
            body: JSON.stringify(device),
        });
    },

    update: async (id: string, device: Partial<CreateDeviceRequest>): Promise<Device> => {
        return apiFetch<Device>(`/${id}`, {
            method: 'PUT',
            body: JSON.stringify(device),
        });
    },

    delete: async (id: string): Promise<void> => {
        return apiFetch<void>(`/${id}`, {
            method: 'DELETE',
        });
    }
};
