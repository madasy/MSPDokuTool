import { useParams, Link } from 'react-router-dom';
import {
    Server, Network, ArrowRight, Loader2, Building2, Cpu, Monitor,
    Wifi, FileText, Shield, AlertTriangle, CheckCircle, Info, MapPin,
    HardDrive, Rocket,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantService, type Tenant, type CategoryScore, type ActionItem } from '../services/TenantService';
import { DashboardService, type ActivityEntry } from '../services/DashboardService';
import { useAuth } from '../auth/AuthProvider';

// ─── Profile Labels ──────────────────────────────────────────────────────────

const PROFILE_LABELS: Record<string, string> = {
    SMALL_OFFICE: 'Kleines Büro',
    SINGLE_SITE: 'Einzelstandort',
    MULTI_SITE: 'Multistandort',
    MANAGED_INFRA: 'Managed Infrastruktur',
    SECURITY_FOCUSED: 'Sicherheitsfokus',
    CUSTOM: 'Benutzerdefiniert',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
    basic: 'Basis',
    operational: 'Operational',
    managed: 'Verwaltet',
    fully_documented: 'Vollständig',
};

const LEVEL_COLORS: Record<string, string> = {
    basic: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    operational: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    managed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    fully_documented: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function scoreColor(score: number): string {
    if (score >= 70) return 'bg-green-600';
    if (score >= 40) return 'bg-amber-600';
    return 'bg-red-600';
}

function scoreTextColor(score: number): string {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

function severityBorder(severity: ActionItem['severity']): string {
    switch (severity) {
        case 'critical': return 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10';
        case 'warning': return 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10';
        case 'ok': return 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10';
        default: return 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800';
    }
}

function SeverityIcon({ severity }: { severity: ActionItem['severity'] }) {
    const cls = 'shrink-0 mt-0.5';
    switch (severity) {
        case 'critical': return <AlertTriangle size={16} className={`${cls} text-red-500`} />;
        case 'warning': return <AlertTriangle size={16} className={`${cls} text-amber-500`} />;
        case 'ok': return <CheckCircle size={16} className={`${cls} text-green-500`} />;
        default: return <Info size={16} className={`${cls} text-blue-500`} />;
    }
}

function formatTimestamp(ts: string): string {
    const d = new Date(ts);
    return d.toLocaleString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScoreCard({ category, score }: { category: string; score: number }) {
    const pct = Math.round(score);
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex flex-col gap-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                {category}
            </p>
            <p className={`text-2xl font-bold ${scoreTextColor(pct)}`}>{pct}%</p>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                    className={`h-full rounded-full ${scoreColor(pct)} transition-all`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function ActionCard({ severity, title, description, link }: ActionItem) {
    const inner = (
        <div className={`rounded-xl border p-4 flex gap-3 ${severityBorder(severity)}`}>
            <SeverityIcon severity={severity} />
            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{title}</p>
                {description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{description}</p>
                )}
            </div>
        </div>
    );
    if (link) {
        return <Link to={link}>{inner}</Link>;
    }
    return inner;
}

function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
    );
}

function ActivityIcon({ type }: { type: ActivityEntry['type'] }) {
    switch (type) {
        case 'device': return <Cpu size={14} className="text-blue-500" />;
        case 'subnet': return <Network size={14} className="text-green-500" />;
        default: return <HardDrive size={14} className="text-slate-400" />;
    }
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TenantDashboardPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
    });

    const { data: summary } = useQuery({
        queryKey: ['tenant', tenantId, 'summary'],
        queryFn: () => TenantService.getSummary(tenantId!),
        enabled: !!tenantId,
    });

    const { data: health, isLoading: healthLoading } = useQuery({
        queryKey: ['tenant', tenantId, 'health'],
        queryFn: () => TenantService.getHealth(tenantId!),
        enabled: !!tenantId,
    });

    const { data: activity, isLoading: activityLoading } = useQuery({
        queryKey: ['dashboard', 'activity'],
        queryFn: () => DashboardService.getActivity(10),
    });

    const tenant = tenants?.find((t: Tenant) => t.id === tenantId);
    const levelLabel = health ? (LEVEL_LABELS[health.overallLevel] ?? health.overallLevel) : null;
    const levelColorClass = health ? (LEVEL_COLORS[health.overallLevel] ?? 'bg-slate-100 text-slate-700') : null;
    const showWizard = health ? health.overallScore < 50 : false;

    const handleProfileChange = async (newProfile: string) => {
        if (!tenantId) return;
        await TenantService.update(tenantId, { profile: newProfile });
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
    };

    return (
        <div className="page space-y-8">

            {/* ── Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="page-title">{tenant?.name ?? 'Tenant'}</h1>
                        {levelLabel && (
                            <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold ${levelColorClass}`}>
                                {levelLabel}
                                {health && <span className="ml-1 opacity-70">— {Math.round(health.overallScore)}%</span>}
                            </span>
                        )}
                        {user?.role === 'ADMIN' && tenant && (
                            <select
                                value={tenant.profile || 'SINGLE_SITE'}
                                onChange={e => handleProfileChange(e.target.value)}
                                className="text-xs px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer hover:border-primary-400 transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500"
                                title="Kundenprofil"
                            >
                                {Object.entries(PROFILE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        )}
                        {user?.role !== 'ADMIN' && tenant?.profile && (
                            <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                {PROFILE_LABELS[tenant.profile] ?? tenant.profile}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">{tenant?.identifier}</p>
                </div>

                {showWizard && (
                    <Link
                        to={`/tenants/${tenantId}/wizard`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors shadow-sm"
                    >
                        <Rocket size={15} />
                        Setup starten
                    </Link>
                )}
            </div>

            {/* ── Score Cards ── */}
            {healthLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={22} className="animate-spin text-slate-400" />
                </div>
            ) : health?.categories && health.categories.length > 0 ? (
                <div>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                        Dokumentations-Score
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                        {health.categories.map((c: CategoryScore) => (
                            <ScoreCard key={c.category} category={c.category} score={c.score} />
                        ))}
                    </div>
                </div>
            ) : null}

            {/* ── Action Required ── */}
            {health?.actions && health.actions.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                        Handlungsbedarf
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {health.actions.map((a: ActionItem, i: number) => (
                            <ActionCard key={i} {...a} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Infrastruktur ── */}
            {summary && (
                <div>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                        Infrastruktur
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard
                            value={summary.deviceCount}
                            label="Geräte"
                            sub={Object.keys(summary.devicesByType).length > 0
                                ? Object.entries(summary.devicesByType).map(([t, c]) => `${t}: ${c}`).join(', ')
                                : undefined}
                        />
                        <StatCard value={summary.subnetCount} label="Subnetze" />
                        <StatCard value={summary.rackCount} label="Racks" />
                        <StatCard value={`${summary.ipUtilization.toFixed(1)}%`} label="IP-Auslastung" />
                    </div>
                </div>
            )}

            {/* ── Schnellzugriff ── */}
            <div>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                    Schnellzugriff
                </h2>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700">
                    <QuickLink icon={<Building2 size={16} />} label="Standorte & Räume" to={`/tenants/${tenantId}/sites`} />
                    <QuickLink icon={<Server size={16} />} label="Racks & Hardware" to={`/tenants/${tenantId}/racks`} />
                    <QuickLink icon={<Cpu size={16} />} label="Hardware" to={`/tenants/${tenantId}/hardware`} />
                    <QuickLink icon={<Network size={16} />} label="IP-Plan & Netzwerk" to={`/tenants/${tenantId}/network`} />
                    <QuickLink icon={<Monitor size={16} />} label="Switches" to={`/tenants/${tenantId}/switches`} />
                    <QuickLink icon={<Wifi size={16} />} label="Access Points" to={`/tenants/${tenantId}/access-points`} />
                    <QuickLink icon={<Shield size={16} />} label="Firewall" to={`/tenants/${tenantId}/firewall`} />
                    <QuickLink icon={<MapPin size={16} />} label="Standorte" to={`/tenants/${tenantId}/sites`} />
                    <QuickLink icon={<FileText size={16} />} label="Dokumentation" to={`/tenants/${tenantId}/docs`} />
                </div>
            </div>

            {/* ── Letzte Änderungen ── */}
            <div>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
                    Letzte Änderungen
                </h2>
                {activityLoading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 size={18} className="animate-spin text-slate-400" />
                    </div>
                ) : activity && activity.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                        {activity.map((entry: ActivityEntry, i: number) => (
                            <div key={i} className="px-4 py-3 flex items-center gap-3">
                                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700">
                                    <ActivityIcon type={entry.type} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {entry.name}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {entry.action === 'created' ? 'Erstellt' : 'Aktualisiert'}
                                        {entry.tenantName && <span className="ml-1">· {entry.tenantName}</span>}
                                    </p>
                                </div>
                                <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                                    {formatTimestamp(entry.timestamp)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-10 text-center text-sm text-slate-400">
                        Keine Aktivitäten vorhanden
                    </div>
                )}
            </div>

        </div>
    );
}

function QuickLink({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
    return (
        <Link
            to={to}
            className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
        >
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {icon}
            </div>
            <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
            <ArrowRight size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-primary-500 transition-colors" />
        </Link>
    );
}
