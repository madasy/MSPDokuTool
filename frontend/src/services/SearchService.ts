import { apiFetch } from './apiClient';

export interface SearchResult {
    type: string;
    id: string;
    title: string;
    subtitle: string | null;
    tenantId: string | null;
    tenantName: string | null;
    link: string;
}

export interface SearchResponse {
    query: string;
    totalResults: number;
    results: SearchResult[];
}

export const SearchService = {
    search: (query: string, limit = 20) =>
        apiFetch<SearchResponse>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`),
};
