import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setTokenGetter } from '../services/apiClient';
import { AuthServiceApi, type AuthUser, type LoginResponse } from '../services/AuthService';

interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setupRequired: boolean;
    pendingToken: string | null;
    login: (email: string, password: string) => Promise<LoginResponse>;
    verifyTotp: (code: string) => Promise<LoginResponse>;
    logout: () => void;
    setAuthFromResponse: (response: LoginResponse) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null, isAuthenticated: false, isLoading: true, setupRequired: false, pendingToken: null,
    login: async () => ({ token: null, pendingToken: null, requiresTotp: false, user: null }),
    verifyTotp: async () => ({ token: null, pendingToken: null, requiresTotp: false, user: null }),
    logout: () => {}, setAuthFromResponse: () => {},
});

export function useAuth() { return useContext(AuthContext); }

// Persist token in sessionStorage so it survives page refresh
function loadStoredAuth(): { token: string | null; user: AuthUser | null } {
    try {
        const token = sessionStorage.getItem('mspdoku_token');
        const userJson = sessionStorage.getItem('mspdoku_user');
        if (token && userJson) {
            return { token, user: JSON.parse(userJson) };
        }
    } catch { /* ignore parse errors */ }
    return { token: null, user: null };
}

function saveAuth(token: string | null, user: AuthUser | null) {
    if (token && user) {
        sessionStorage.setItem('mspdoku_token', token);
        sessionStorage.setItem('mspdoku_user', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('mspdoku_token');
        sessionStorage.removeItem('mspdoku_user');
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const stored = loadStoredAuth();
    const [user, setUser] = useState<AuthUser | null>(stored.user);
    const [token, setToken] = useState<string | null>(stored.token);
    const [pendingToken, setPendingToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [setupRequired, setSetupRequired] = useState(false);

    // Check auth config on mount
    useEffect(() => {
        AuthServiceApi.getConfig()
            .then((config) => setSetupRequired(config.setupRequired))
            .catch(() => {})
            .finally(() => setIsLoading(false));
    }, []);

    // Wire token to apiClient
    useEffect(() => { setTokenGetter(() => token); }, [token]);

    // Persist auth state changes
    useEffect(() => { saveAuth(token, user); }, [token, user]);

    // Listen for 401 events (token expired)
    useEffect(() => {
        const handler = () => {
            setToken(null);
            setUser(null);
        };
        window.addEventListener('auth:unauthorized', handler);
        return () => window.removeEventListener('auth:unauthorized', handler);
    }, []);

    const setAuthFromResponse = (response: LoginResponse) => {
        if (response.token && response.user) {
            setToken(response.token);
            setUser(response.user);
            setSetupRequired(false);
            setPendingToken(null);
        }
        if (response.pendingToken) setPendingToken(response.pendingToken);
    };

    const login = async (email: string, password: string): Promise<LoginResponse> => {
        const response = await AuthServiceApi.login(email, password);
        setAuthFromResponse(response);
        return response;
    };

    const verifyTotp = async (code: string): Promise<LoginResponse> => {
        if (!pendingToken) throw new Error('No pending token');
        const response = await AuthServiceApi.verifyTotp(pendingToken, code);
        setAuthFromResponse(response);
        return response;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setPendingToken(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated: !!token && !!user,
            isLoading,
            setupRequired,
            pendingToken,
            login,
            verifyTotp,
            logout,
            setAuthFromResponse,
        }}>
            {children}
        </AuthContext.Provider>
    );
}
