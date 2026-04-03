import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { Loader2, AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
    const { isAuthenticated, isLoading, setupRequired, login, verifyTotp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showTotp, setShowTotp] = useState(false);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 size={32} className="animate-spin text-primary-400" /></div>;
    if (setupRequired) return <Navigate to="/setup" replace />;
    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setSubmitting(true);
        try {
            const response = await login(email, password);
            if (response.requiresTotp) setShowTotp(true);
        } catch { setError('Ungültige Anmeldedaten'); }
        finally { setSubmitting(false); }
    };

    const handleTotp = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setSubmitting(true);
        try { await verifyTotp(totpCode); }
        catch { setError('Ungültiger TOTP-Code'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="w-full max-w-sm mx-4">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">D</div>
                    <h1 className="text-xl font-bold text-white">MSP DokuTool</h1>
                    <p className="text-slate-400 text-sm mt-1">IT Infrastructure Documentation</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-900/20 rounded-lg border border-red-800/30"><AlertCircle size={16} />{error}</div>}
                    {!showTotp ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">E-Mail</label>
                                <input type="email" required className="input w-full" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" autoFocus /></div>
                            <div><label className="block text-xs font-medium text-slate-400 mb-1">Passwort</label>
                                <input type="password" required className="input w-full" value={password} onChange={e => setPassword(e.target.value)} /></div>
                            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Anmelden'}</button>
                        </form>
                    ) : (
                        <form onSubmit={handleTotp} className="space-y-4">
                            <p className="text-sm text-slate-300 text-center">6-stelligen Code eingeben</p>
                            <input type="text" required className="input w-full text-center text-2xl tracking-widest font-mono"
                                value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} autoFocus />
                            <button type="submit" disabled={submitting || totpCode.length !== 6} className="btn-primary w-full py-2.5">
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Bestätigen'}</button>
                            <button type="button" onClick={() => { setShowTotp(false); setTotpCode(''); }}
                                className="text-xs text-slate-400 hover:text-white text-center w-full">Zurück</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
