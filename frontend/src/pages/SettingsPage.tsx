import { useAuth } from '../auth/AuthProvider';
import { Navigate } from 'react-router-dom';
import { Settings, Database, Shield, Globe, Bell } from 'lucide-react';

export default function SettingsPage() {
    const { user } = useAuth();

    if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;

    return (
        <div className="page max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
                <Settings size={24} className="text-slate-400" />
                <h1 className="page-title">Einstellungen</h1>
            </div>

            {/* System Info */}
            <div className="card p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Database size={18} className="text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">System</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500">Version:</span> <span className="font-mono font-medium">0.1.0-dev</span></div>
                    <div><span className="text-slate-500">Backend:</span> <span className="font-mono font-medium">Spring Boot 3.3</span></div>
                    <div><span className="text-slate-500">Datenbank:</span> <span className="font-mono font-medium">PostgreSQL 16</span></div>
                    <div><span className="text-slate-500">Frontend:</span> <span className="font-mono font-medium">React 19</span></div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="card p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield size={18} className="text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sicherheit</h2>
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-medium text-slate-700 dark:text-slate-200">JWT Token Gültigkeit</p>
                            <p className="text-xs text-slate-400">Access Token Ablaufzeit</p>
                        </div>
                        <span className="font-mono text-slate-600 dark:text-slate-300">15 Minuten</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
                        <div>
                            <p className="font-medium text-slate-700 dark:text-slate-200">2FA für Kunden-Benutzer</p>
                            <p className="text-xs text-slate-400">TOTP wird bei Tenant-User Erstellung erzwungen</p>
                        </div>
                        <span className="badge badge-ok">Aktiviert</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
                        <div>
                            <p className="font-medium text-slate-700 dark:text-slate-200">Passwort-Mindestlänge</p>
                            <p className="text-xs text-slate-400">Minimum für alle Benutzer</p>
                        </div>
                        <span className="font-mono text-slate-600 dark:text-slate-300">8 Zeichen</span>
                    </div>
                </div>
            </div>

            {/* General Settings */}
            <div className="card p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Globe size={18} className="text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Allgemein</h2>
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="font-medium text-slate-700 dark:text-slate-200">Standard-Profil für neue Tenants</p>
                            <p className="text-xs text-slate-400">Dokumentations-Profil bei Erstellung</p>
                        </div>
                        <span className="font-mono text-slate-600 dark:text-slate-300">SINGLE_SITE</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-700">
                        <div>
                            <p className="font-medium text-slate-700 dark:text-slate-200">Sprache</p>
                            <p className="text-xs text-slate-400">UI-Sprache</p>
                        </div>
                        <span className="text-slate-600 dark:text-slate-300">Deutsch</span>
                    </div>
                </div>
            </div>

            {/* Future: Notifications */}
            <div className="card p-5 opacity-60">
                <div className="flex items-center gap-2 mb-2">
                    <Bell size={18} className="text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Benachrichtigungen</h2>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">Kommt bald</span>
                </div>
                <p className="text-xs text-slate-400">E-Mail-Benachrichtigungen für Änderungen, ablaufende Verträge und Sicherheitswarnungen.</p>
            </div>
        </div>
    );
}
