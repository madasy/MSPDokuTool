import { useParams, Link } from 'react-router-dom';
import { Server, Network, Activity, FileText, ArrowRight, Shield, Clock } from 'lucide-react';
import ProvidedByMspPanel from '../components/tenant/ProvidedByMspPanel';
import NotesAndFieldsPanel from '../components/doc/NotesAndFieldsPanel';

// Mock data for a tenant
const MOCK_TENANT_DATA = {
    name: 'Kanzlei Müller',
    identifier: 'kanzlei-mueller',
    devices: 18,
    subnets: 4,
    publicIps: 6,
    lastChange: 'vor 12 Min.',
    status: 'ok' as const,
    contracts: [
        { name: 'Wartungsvertrag Server', expiry: '30.04.2025', status: 'ok' as const },
        { name: 'SSL Zertifikat', expiry: '27.06.2025', status: 'warning' as const },
    ],
    links: [
        { label: 'Firewall Admin', url: 'https://fw.kanzlei-mueller.ch' },
        { label: 'ESXi Host', url: 'https://esxi01.kanzlei-mueller.local' },
        { label: 'M365 Admin', url: 'https://admin.microsoft.com' },
    ],
};

export default function TenantDashboardPage() {
    const { tenantId } = useParams();

    return (
        <div className="page">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="page-title">{MOCK_TENANT_DATA.name}</h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-mono">{MOCK_TENANT_DATA.identifier}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${MOCK_TENANT_DATA.status === 'ok' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Alles OK</span>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <QuickStatCard icon={<Server size={18} />} label="Geräte" value={MOCK_TENANT_DATA.devices} link={`/tenants/${tenantId}/racks`} />
                <QuickStatCard icon={<Network size={18} />} label="Subnetze" value={MOCK_TENANT_DATA.subnets} link={`/tenants/${tenantId}/network`} />
                <QuickStatCard icon={<Shield size={18} />} label="Public IPs" value={MOCK_TENANT_DATA.publicIps} />
                <QuickStatCard icon={<Clock size={18} />} label="Letzte Änderung" value={MOCK_TENANT_DATA.lastChange} small />
            </div>

            {tenantId && <ProvidedByMspPanel tenantId={tenantId} />}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Navigation */}
                <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/70 dark:border-white/10">
                        <h2 className="font-semibold text-slate-900 dark:text-white">Schnellzugriff</h2>
                    </div>
                    <div className="divide-y divide-white/70 dark:divide-white/10">
                        <QuickLink icon={<Server size={16} />} label="Racks & Hardware" desc="18 Geräte in 2 Racks" to={`/tenants/${tenantId}/racks`} />
                        <QuickLink icon={<Network size={16} />} label="IP-Plan & Netzwerk" desc="4 Subnetze, 156 IPs" to={`/tenants/${tenantId}/network`} />
                    </div>
                </div>

                {/* Contracts / Auslaufende Verträge */}
                <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/70 dark:border-white/10">
                        <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <FileText size={16} className="text-slate-500 dark:text-slate-400" />
                            Verträge & Lizenzen
                        </h2>
                    </div>
                    <div className="divide-y divide-white/70 dark:divide-white/10">
                        {MOCK_TENANT_DATA.contracts.map((c, i) => (
                            <div key={i} className="px-5 py-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">{c.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Ablauf: {c.expiry}</p>
                                </div>
                                <div className={`badge ${c.status === 'ok' ? 'badge-ok' : 'badge-warning'}`}>
                                    {c.status === 'ok' ? 'OK' : 'Bald fällig'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Wichtige Links */}
                <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/70 dark:border-white/10">
                        <h2 className="font-semibold text-slate-900 dark:text-white">Wichtige Links</h2>
                    </div>
                    <div className="p-4 space-y-2">
                        {MOCK_TENANT_DATA.links.map((link, i) => (
                            <a
                                key={i}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/70 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-200 group transition-colors"
                            >
                                <Activity size={14} className="text-slate-500 dark:text-slate-400" />
                                <span className="flex-1">{link.label}</span>
                                <ArrowRight size={12} className="text-slate-400 dark:text-slate-500 group-hover:text-primary-500 transition-colors" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {tenantId && <NotesAndFieldsPanel entityType="TENANT" entityId={tenantId} />}
        </div>
    );
}

function QuickStatCard({ icon, label, value, link, small }: {
    icon: React.ReactNode; label: string; value: string | number; link?: string; small?: boolean;
}) {
    const content = (
        <div className="card p-5 flex items-start gap-3 group">
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">{icon}</div>
            <div>
                <p className={`font-bold text-slate-900 dark:text-white ${small ? 'text-sm' : 'text-xl'}`}>{value}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{label}</p>
            </div>
        </div>
    );

    if (link) return <Link to={link}>{content}</Link>;
    return content;
}

function QuickLink({ icon, label, desc, to }: {
    icon: React.ReactNode; label: string; desc: string; to: string;
}) {
    return (
        <Link to={to} className="px-5 py-4 flex items-center gap-4 hover:bg-white/70 dark:hover:bg-white/5 transition-colors group">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
            </div>
            <ArrowRight size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-primary-500 transition-colors" />
        </Link>
    );
}
