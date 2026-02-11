export interface Rack {
    id: string;
    name: string;
    heightUnits: number;
    devices: Device[];
}

export interface Device {
    id: string;
    name: string;
    deviceType: 'SERVER' | 'SWITCH' | 'ROUTER' | 'FIREWALL' | 'PATCHPANEL' | 'PDU' | 'WIFI_AP' | 'OTHER';
    status: 'ACTIVE' | 'PLANNED' | 'STORAGE' | 'RETIRED';
    positionU?: number;
    heightU: number;
}

export interface CreateRackRequest {
    name: string;
    heightUnits?: number;
    roomId?: string;
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

export const RackService = {
    getAll: () => apiFetch<Rack[]>('/racks'),
    get: (id: string) => apiFetch<Rack>(`/racks/${id}`),
    // Temporary helper to random room or need logic
    // For MVP creating rack without room might fail in backend if we strictly enforced it, 
    // but Controller throws if no room. We need a way to get a Room ID or create one.
    // Let's assume for now we list racks and view them. Creation might need a Room selection.
    create: (data: CreateRackRequest) => apiFetch<Rack>('/racks', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
};
