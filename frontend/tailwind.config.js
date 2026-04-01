/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#ecfdfb',
                    100: '#cff5f0',
                    200: '#9fe9df',
                    300: '#5ed6c7',
                    400: '#14b8a6',
                    500: '#0ea5a4',
                    600: '#0f8f8c',
                    700: '#0f7574',
                    800: '#0f5b5a',
                    900: '#0e4343',
                },
                sidebar: {
                    DEFAULT: '#0b1220',
                    light: '#101a2b',
                    hover: '#162238',
                },
                status: {
                    ok: '#22c55e',
                    error: '#ef4444',
                    planned: '#9ca3af',
                    warning: '#f59e0b',
                },
                ip: {
                    free: '#d1d5db',
                    used: '#ef4444',
                    reserved: '#f59e0b',
                    dhcp: '#3b82f6',
                },
            },
            fontFamily: {
                sans: ['Sora', 'Manrope', 'ui-sans-serif', 'system-ui'],
                mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
        },
    },
    plugins: [],
}
