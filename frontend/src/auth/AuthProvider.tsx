import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { UserManager, User, WebStorageStateStore } from 'oidc-client-ts';
import { setTokenGetter } from '../services/apiClient';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: () => void;
    logout: () => void;
    getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: () => {},
    logout: () => {},
    getAccessToken: () => null,
});

export function useAuth() {
    return useContext(AuthContext);
}

// ZITADEL OIDC configuration
// Client ID will need to be configured after ZITADEL first start
const ZITADEL_ISSUER = 'http://localhost:8085';

function getClientId(): string {
    return localStorage.getItem('mspdoku_oidc_client_id') || '';
}

function createUserManager(clientId: string): UserManager | null {
    if (!clientId) return null;
    return new UserManager({
        authority: ZITADEL_ISSUER,
        client_id: clientId,
        redirect_uri: `${window.location.origin}/auth/callback`,
        post_logout_redirect_uri: window.location.origin,
        response_type: 'code',
        scope: 'openid profile email',
        userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    });
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userManager, setUserManager] = useState<UserManager | null>(null);

    // Wire token getter into apiClient whenever user changes
    useEffect(() => {
        setTokenGetter(() => user?.access_token || null);
    }, [user]);

    useEffect(() => {
        const clientId = getClientId();
        if (!clientId) {
            setIsLoading(false);
            return;
        }
        const mgr = createUserManager(clientId);
        setUserManager(mgr);
        if (!mgr) { setIsLoading(false); return; }

        // Check if returning from OIDC callback
        if (window.location.pathname === '/auth/callback') {
            mgr.signinRedirectCallback()
                .then((u) => {
                    setUser(u);
                    window.history.replaceState({}, '', '/');
                })
                .catch((err) => {
                    console.error('OIDC callback error:', err);
                    window.history.replaceState({}, '', '/');
                })
                .finally(() => setIsLoading(false));
        } else {
            // Try to get existing user from session
            mgr.getUser()
                .then((u) => {
                    if (u && !u.expired) {
                        setUser(u);
                    }
                })
                .finally(() => setIsLoading(false));
        }
    }, []);

    const login = () => {
        const clientId = getClientId();
        if (!clientId) {
            // Redirect to setup page
            window.location.href = '/setup';
            return;
        }
        const mgr = userManager || createUserManager(clientId);
        mgr?.signinRedirect();
    };

    const logout = () => {
        if (userManager) {
            userManager.signoutRedirect();
        }
        setUser(null);
    };

    const getAccessToken = () => user?.access_token || null;

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user && !user.expired, isLoading, login, logout, getAccessToken }}>
            {children}
        </AuthContext.Provider>
    );
}
