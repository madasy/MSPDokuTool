import { useState, useEffect, useCallback, createContext, useContext } from 'react';

export interface Favorite {
    id: string;
    label: string;
    path: string;
    type: 'tenant' | 'rack' | 'device' | 'subnet';
}

interface FavoritesContextValue {
    favorites: Favorite[];
    addFavorite: (fav: Favorite) => void;
    removeFavorite: (id: string) => void;
    isFavorite: (id: string) => boolean;
    toggleFavorite: (fav: Favorite) => void;
}

const STORAGE_KEY = 'msp-doku-favorites';

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function useFavorites() {
    const ctx = useContext(FavoritesContext);
    if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
    return ctx;
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
    const [favorites, setFavorites] = useState<Favorite[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }, [favorites]);

    const addFavorite = useCallback((fav: Favorite) => {
        setFavorites(prev => {
            if (prev.find(f => f.id === fav.id)) return prev;
            return [...prev, fav];
        });
    }, []);

    const removeFavorite = useCallback((id: string) => {
        setFavorites(prev => prev.filter(f => f.id !== id));
    }, []);

    const isFavorite = useCallback((id: string) => {
        return favorites.some(f => f.id === id);
    }, [favorites]);

    const toggleFavorite = useCallback((fav: Favorite) => {
        if (favorites.some(f => f.id === fav.id)) {
            removeFavorite(fav.id);
        } else {
            addFavorite(fav);
        }
    }, [favorites, addFavorite, removeFavorite]);

    return (
        <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite }}>
            {children}
        </FavoritesContext.Provider>
    );
}
