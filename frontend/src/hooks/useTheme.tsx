import { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolved: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}

function getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem('msp-doku-theme') as Theme) || 'light';
    });

    const resolved: 'light' | 'dark' = theme === 'system' ? getSystemTheme() : theme;

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t);
        localStorage.setItem('msp-doku-theme', t);
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        if (resolved === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [resolved]);

    // Listen for system theme changes
    useEffect(() => {
        if (theme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => setThemeState('system'); // trigger re-render
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
            {children}
        </ThemeContext.Provider>
    );
}
