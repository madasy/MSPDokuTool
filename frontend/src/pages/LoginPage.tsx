import { useAuth } from '../auth/AuthProvider';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const { login, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 size={32} className="animate-spin text-primary-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                    D
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">MSP DokuTool</h1>
                <p className="text-slate-400 mb-8">IT Infrastructure Documentation</p>
                <button
                    onClick={login}
                    className="btn-primary px-8 py-3 text-base"
                >
                    Anmelden
                </button>
            </div>
        </div>
    );
}
