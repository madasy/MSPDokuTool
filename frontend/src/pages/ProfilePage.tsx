import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { AuthServiceApi } from '../services/AuthService';
import { Shield, ShieldCheck, Key, Loader2, AlertCircle, Copy } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export default function ProfilePage() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [totpSetup, setTotpSetup] = useState<{ secret: string; qrCodeUri: string } | null>(null);
    const [totpCode, setTotpCode] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [error, setError] = useState('');

    // Get token from sessionStorage for direct API calls
    const token = sessionStorage.getItem('mspdoku_token') || '';

    const handleSetupTotp = async () => {
        setSetupLoading(true);
        setError('');
        try {
            const response = await AuthServiceApi.setupTotp(token);
            setTotpSetup(response);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSetupLoading(false);
        }
    };

    const handleConfirmTotp = async () => {
        if (totpCode.length !== 6) return;
        setConfirmLoading(true);
        setError('');
        try {
            await AuthServiceApi.confirmTotp(token, totpCode);
            setTotpSetup(null);
            setTotpCode('');
            addToast({ type: 'success', title: '2FA aktiviert', message: 'Zwei-Faktor-Authentifizierung ist jetzt aktiv.' });
            // Update the user state — need to reload
            window.location.reload();
        } catch (err) {
            setError('Ungültiger Code. Bitte erneut versuchen.');
        } finally {
            setConfirmLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (passwordForm.new.length < 8) { setError('Neues Passwort muss mindestens 8 Zeichen haben.'); return; }
        if (passwordForm.new !== passwordForm.confirm) { setError('Passwörter stimmen nicht überein.'); return; }
        setPwLoading(true);
        try {
            const response = await fetch('/api/v1/auth/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.new }),
            });
            if (!response.ok) throw new Error('Aktuelles Passwort falsch');
            setPasswordForm({ current: '', new: '', confirm: '' });
            addToast({ type: 'success', title: 'Passwort geändert' });
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setPwLoading(false);
        }
    };

    const roleLabel = user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'TECHNICIAN' ? 'Techniker' : 'Kunden-Benutzer';

    return (
        <div className="page max-w-2xl">
            <h1 className="page-title mb-6">Profil & Sicherheit</h1>

            {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/30">
                    <AlertCircle size={16} />{error}
                </div>
            )}

            {/* User Info */}
            <div className="card p-5 mb-6">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Benutzerdaten</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500">E-Mail:</span> <span className="font-medium">{user?.email}</span></div>
                    <div><span className="text-slate-500">Name:</span> <span className="font-medium">{user?.displayName || '—'}</span></div>
                    <div><span className="text-slate-500">Rolle:</span> <span className="font-medium">{roleLabel}</span></div>
                    <div><span className="text-slate-500">2FA:</span> <span className="font-medium">{user?.totpEnabled ? '✅ Aktiv' : '❌ Nicht aktiv'}</span></div>
                </div>
            </div>

            {/* 2FA Setup */}
            <div className="card p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    {user?.totpEnabled ? <ShieldCheck size={18} className="text-green-500" /> : <Shield size={18} className="text-amber-500" />}
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Zwei-Faktor-Authentifizierung (2FA)</h2>
                </div>

                {user?.totpEnabled ? (
                    <p className="text-sm text-green-600 dark:text-green-400">
                        2FA ist aktiv. Dein Account ist durch einen TOTP-Code geschützt.
                    </p>
                ) : (
                    <>
                        <p className="text-sm text-slate-500 mb-4">
                            Schütze deinen Account mit einem Einmal-Code aus einer Authenticator-App (Google Authenticator, Authy, etc.).
                            {user?.totpRequired && <span className="text-amber-600 font-medium"> 2FA ist für deine Rolle erforderlich.</span>}
                        </p>

                        {!totpSetup ? (
                            <button onClick={handleSetupTotp} disabled={setupLoading} className="btn-primary inline-flex items-center gap-2">
                                {setupLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                                2FA einrichten
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                                        1. Scanne diesen Code mit deiner Authenticator-App:
                                    </p>
                                    {/* QR Code via Google Charts API */}
                                    <div className="flex justify-center mb-3">
                                        <img
                                            src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(totpSetup.qrCodeUri)}`}
                                            alt="TOTP QR Code"
                                            className="rounded-lg"
                                            width={200}
                                            height={200}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mb-1">Oder manuell eingeben:</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-xs font-mono bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded flex-1 select-all">{totpSetup.secret}</code>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(totpSetup.secret); addToast({ type: 'info', title: 'Kopiert' }); }}
                                            className="btn-icon p-1"
                                        >
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                                        2. Gib den 6-stelligen Code aus der App ein:
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={totpCode}
                                            onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            maxLength={6}
                                            className="input text-center text-xl tracking-widest font-mono w-40"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleConfirmTotp}
                                            disabled={totpCode.length !== 6 || confirmLoading}
                                            className="btn-primary"
                                        >
                                            {confirmLoading ? <Loader2 size={14} className="animate-spin" /> : 'Bestätigen'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Change Password */}
            <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Key size={18} className="text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Passwort ändern</h2>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Aktuelles Passwort</label>
                        <input type="password" required className="input w-full" value={passwordForm.current}
                            onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Neues Passwort</label>
                        <input type="password" required minLength={8} className="input w-full" value={passwordForm.new}
                            onChange={e => setPasswordForm(p => ({ ...p, new: e.target.value }))} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Neues Passwort bestätigen</label>
                        <input type="password" required className="input w-full" value={passwordForm.confirm}
                            onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} />
                    </div>
                    <button type="submit" disabled={pwLoading} className="btn-primary">
                        {pwLoading ? <Loader2 size={14} className="animate-spin" /> : 'Passwort ändern'}
                    </button>
                </form>
            </div>
        </div>
    );
}
