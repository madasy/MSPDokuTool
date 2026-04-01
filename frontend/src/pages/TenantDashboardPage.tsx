import { useParams, Link } from 'react-router-dom';
import { Server, Network, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TenantService, type Tenant } from '../services/TenantService';

export default function TenantDashboardPage() {
    const { tenantId } = useParams<{ tenantId: string }>();

    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
    });

    const { data: summary, isLoading } = useQuery({
        queryKey: ['tenant', tenantId, 'summary'],
        queryFn: () => TenantService.getSummary(tenantId!),
        enabled: !!tenantId,
    });

    const tenant = tenants?.find((t: Tenant) => t.id === tenantId);

    return (
        <div className="page">
            {/* Header */}
            <div className="mb-8">
                <h1 className="page-title">{tenant?.name ?? 'Tenant'}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 font-mono">{tenant?.identifier}</p>
            </div>

            {/* Quick Stats */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard label="Geräte" value={summary.deviceCount} />
                        <StatCard label="Subnetze" value={summary.subnetCount} />
                        <StatCard label="IP-Auslastung" value={`${summary.ipUtilization.toFixed(1)}%`} />
                        <StatCard label="Racks" value={summary.rackCount} />
                    </div>

                    {/* Device Breakdown */}
                    {Object.keys(summary.devicesByType).length > 0 && (
                        <div className="card p-5 mb-6">
                            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Geräte nach Typ</h3>
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(summary.devicesByType).map(([type, count]) => (
                                    <div key={type} className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                                        {type}: {count}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-12 text-sm text-slate-400">
                    Keine Infrastrukturdaten vorhanden
                </div>
            )}

            {/* Quick Navigation */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-900 dark:text-white">Schnellzugriff</h2>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    <QuickLink icon={<Server size={16} />} label="Racks & Hardware" to={`/tenants/${tenantId}/racks`} />
                    <QuickLink icon={<Network size={16} />} label="IP-Plan & Netzwerk" to={`/tenants/${tenantId}/network`} />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="card p-5">
            <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{label}</p>
        </div>
    );
}

function QuickLink({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
    return (
        <Link to={to} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {icon}
            </div>
            <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
            <ArrowRight size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-primary-500 transition-colors" />
        </Link>
    );
}
