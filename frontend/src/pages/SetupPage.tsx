import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AuthServiceApi } from '../services/AuthService';
import { Loader2, AlertCircle } from 'lucide-react';

export default function SetupPage() {
    const { setupRequired, setAuthFromResponse, isAuthenticated } = useAuth();
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (!setupRequired) return <Navigate to="/login" replace />;
    if (isAuthenticated) return <Navigate to="/" replace />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError('');
        if (password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben'); return; }
        if (password !== confirmPassword) { setError('Passwörter stimmen nicht überein'); return; }
        setSubmitting(true);
        try {
            const response = await AuthServiceApi.setup({ email, displayName, password });
            setAuthFromResponse(response);
        } catch (err) { setError((err as Error).message || 'Setup fehlgeschlagen'); }
        finally { setSubmitting(false); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="w-full max-w-md mx-4">
                <div className="text-center mb-8">
                    <div className="w-14 h-14 rounded-xl bg-primary-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">D</div>
                    <h1 className="text-xl font-bold text-white">Ersteinrichtung</h1>
                    <p className="text-slate-400 text-sm mt-1">Erstelle den ersten Administrator</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    {error && <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-900/20 rounded-lg border border-red-800/30"><AlertCircle size={16} />{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">E-Mail *</label>
                            <input type="email" required className="input w-full" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" autoFocus /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Anzeigename</label>
                            <input type="text" className="input w-full" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Admin" /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Passwort *</label>
                            <input type="password" required minLength={8} className="input w-full" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mind. 8 Zeichen" /></div>
                        <div><label className="block text-xs font-medium text-slate-400 mb-1">Passwort bestätigen *</label>
                            <input type="password" required className="input w-full" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
                        <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Admin erstellen & starten'}</button>
                    </form>
                </div>
            </div>
        </div>
    );
}
