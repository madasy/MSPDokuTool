import { useState } from 'react';

export default function SetupPage() {
    const [clientId, setClientId] = useState('');
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        localStorage.setItem('mspdoku_oidc_client_id', clientId);
        setSaved(true);
        setTimeout(() => { window.location.href = '/'; }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-slate-700">
                <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center text-white text-lg font-bold mx-auto mb-6">
                    D
                </div>
                <h1 className="text-xl font-bold text-white text-center mb-2">MSP DokuTool Setup</h1>
                <p className="text-slate-400 text-center text-sm mb-6">
                    Erstelle zuerst eine OIDC-Anwendung in ZITADEL (http://localhost:8085),
                    dann trage die Client-ID hier ein.
                </p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">ZITADEL Client ID</label>
                        <input
                            type="text"
                            className="input w-full"
                            placeholder="z.B. 123456789012345678"
                            value={clientId}
                            onChange={e => setClientId(e.target.value)}
                        />
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-4 text-xs text-slate-400 space-y-2">
                        <p className="font-medium text-slate-300">Setup-Anleitung:</p>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Öffne <a href="http://localhost:8085" target="_blank" className="text-primary-400 underline">ZITADEL Console</a></li>
                            <li>Login: admin / Admin123!</li>
                            <li>Gehe zu Projects → New Project → "MSP DokuTool"</li>
                            <li>New Application → Web → PKCE</li>
                            <li>Redirect URI: <code className="text-primary-300">http://localhost:3000/auth/callback</code></li>
                            <li>Post-Logout URI: <code className="text-primary-300">http://localhost:3000</code></li>
                            <li>Kopiere die Client-ID und trage sie oben ein</li>
                        </ol>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!clientId || saved}
                        className="btn-primary w-full"
                    >
                        {saved ? 'Gespeichert! Weiterleitung...' : 'Speichern & Starten'}
                    </button>
                </div>
            </div>
        </div>
    );
}
