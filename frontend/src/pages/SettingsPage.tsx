import { useState } from 'react';
import { Settings, User, Bell, Shield, Palette, Globe, Save, Moon, Sun } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useTheme as useThemeHook } from '../hooks/useTheme';

interface SettingsSection {
    id: string;
    label: string;
    icon: React.ReactNode;
}

const SECTIONS: SettingsSection[] = [
    { id: 'profile', label: 'Profil', icon: <User size={16} /> },
    { id: 'notifications', label: 'Benachrichtigungen', icon: <Bell size={16} /> },
    { id: 'appearance', label: 'Darstellung', icon: <Palette size={16} /> },
    { id: 'security', label: 'Sicherheit', icon: <Shield size={16} /> },
    { id: 'system', label: 'System', icon: <Globe size={16} /> },
];

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');
    const { addToast } = useToast();

    const handleSave = () => {
        addToast({ type: 'success', title: 'Einstellungen gespeichert', message: 'Deine Änderungen wurden übernommen.' });
    };

    return (
        <div className="page">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <Settings size={24} className="text-slate-400" />
                        Einstellungen
                    </h1>
                    <p className="page-subtitle">Konto, Benachrichtigungen und Systemkonfiguration</p>
                </div>
                <button onClick={handleSave} className="btn-primary">
                    <Save size={14} />
                    Speichern
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Section Nav */}
                <div className="card p-2 h-fit">
                    {SECTIONS.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setActiveSection(s.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeSection === s.id
                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            {s.icon}
                            {s.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    {activeSection === 'profile' && <ProfileSection />}
                    {activeSection === 'notifications' && <NotificationsSection />}
                    {activeSection === 'appearance' && <AppearanceSection />}
                    {activeSection === 'security' && <SecuritySection />}
                    {activeSection === 'system' && <SystemSection />}
                </div>
            </div>
        </div>
    );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <div className="card p-6 mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{description}</p>
            {children}
        </div>
    );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>
            {children}
        </div>
    );
}

function ToggleRow({ label, description, defaultChecked }: { label: string; description?: string; defaultChecked?: boolean }) {
    const [checked, setChecked] = useState(defaultChecked ?? false);
    return (
        <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
            <div>
                <p className="text-sm font-medium text-slate-800 dark:text-white">{label}</p>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
            <button
                onClick={() => setChecked(!checked)}
                className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-primary-400' : 'bg-slate-200 dark:bg-slate-600'}`}
            >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
            </button>
        </div>
    );
}

function ProfileSection() {
    return (
        <SectionCard title="Profil" description="Deine persönlichen Informationen">
            <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-2xl bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xl font-bold">AM</div>
                <div>
                    <p className="font-semibold text-slate-800 dark:text-white">Anish Madassery</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Admin</p>
                </div>
            </div>
            <FormField label="Anzeigename">
                <input type="text" defaultValue="Anish Madassery" className="input" />
            </FormField>
            <FormField label="E-Mail">
                <input type="email" defaultValue="anish@example.com" className="input" disabled />
            </FormField>
            <FormField label="Sprache">
                <select className="input">
                    <option>Deutsch</option>
                    <option>English</option>
                </select>
            </FormField>
        </SectionCard>
    );
}

function NotificationsSection() {
    return (
        <SectionCard title="Benachrichtigungen" description="Wann und wie du informiert wirst">
            <ToggleRow label="E-Mail Benachrichtigungen" description="Zusammenfassung der Änderungen per E-Mail" defaultChecked />
            <ToggleRow label="Vertragswarnungen" description="Hinweis bei ablaufenden Verträgen & Lizenzen" defaultChecked />
            <ToggleRow label="Neue Geräte" description="Benachrichtigung bei neuen Geräten in deinen Tenants" />
            <ToggleRow label="Sicherheitswarnungen" description="SSL-Zertifikate, fehlgeschlagene Logins" defaultChecked />
        </SectionCard>
    );
}

function AppearanceSection() {
    const { theme, setTheme } = useThemeHook();
    return (
        <SectionCard title="Darstellung" description="Look & Feel der Anwendung anpassen">
            <p className="text-xs font-semibold text-slate-600 mb-3">Theme</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { value: 'light' as const, label: 'Hell', icon: <Sun size={18} /> },
                    { value: 'dark' as const, label: 'Dunkel', icon: <Moon size={18} /> },
                    { value: 'system' as const, label: 'System', icon: <Globe size={18} /> },
                ].map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === opt.value
                            ? 'border-primary-400 bg-primary-50 text-primary-700'
                            : 'border-transparent bg-slate-50 text-slate-500 hover:border-slate-200'
                            }`}
                    >
                        {opt.icon}
                        <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                ))}
            </div>
            <ToggleRow label="Kompakte Darstellung" description="Weniger Abstände, mehr Informationen" />
            <ToggleRow label="Animationen" description="Übergangseffekte und Micro-Animations" defaultChecked />
        </SectionCard>
    );
}

function SecuritySection() {
    return (
        <SectionCard title="Sicherheit" description="Authentifizierung und Zugriffskontrolle">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 mb-4">
                <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                    <Shield size={16} />
                    SSO via Microsoft Entra ID aktiv
                </p>
                <p className="text-xs text-blue-600 mt-1">Authentifizierung wird über deinen Organisation-Account verwaltet.</p>
            </div>
            <ToggleRow label="2-Faktor-Authentifizierung" description="Wird über Microsoft Entra ID gesteuert" defaultChecked />
            <ToggleRow label="Sitzungs-Timeout" description="Automatische Abmeldung nach 30 Min. Inaktivität" defaultChecked />
        </SectionCard>
    );
}

function SystemSection() {
    return (
        <SectionCard title="System" description="Globale Systemkonfiguration (Nur Admins)">
            <FormField label="API Base URL">
                <input type="text" defaultValue="http://localhost:8080/api/v1" className="input font-mono" />
            </FormField>
            <FormField label="Standard Tenant">
                <select className="input">
                    <option value="">Keiner (Dashboard)</option>
                    <option>Kanzlei Müller</option>
                    <option>Acme GmbH</option>
                </select>
            </FormField>
            <ToggleRow label="Debug-Modus" description="Erweiterte Fehlerausgabe im Browser" />
            <ToggleRow label="Daten-Export erlauben" description="CSV/Excel-Export für alle Benutzer" defaultChecked />
        </SectionCard>
    );
}
