import { Server, Users, Network, Database, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardService } from '../services/DashboardService';

export default function DashboardPage() {
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: DashboardService.getStats,
    });

    const { data: activity, isLoading: activityLoading } = useQuery({
        queryKey: ['dashboard', 'activity'],
        queryFn: () => DashboardService.getActivity(20),
    });

    const statCards = [
        { label: 'Tenants', value: stats?.tenantCount ?? 0, icon: <Users size={20} />, color: 'text-sky-700 bg-sky-100', link: '/tenants' },
        { label: 'Geräte', value: stats?.totalDevices ?? 0, icon: <Server size={20} />, color: 'text-emerald-700 bg-emerald-100', link: '/tenants' },
        { label: 'Subnetze', value: stats?.totalSubnets ?? 0, icon: <Network size={20} />, color: 'text-cyan-700 bg-cyan-100', link: '/datacenter' },
        { label: 'IP-Adressen', value: stats?.totalIpAddresses ?? 0, icon: <Database size={20} />, color: 'text-violet-700 bg-violet-100', link: '/datacenter' },
    ];

    return (
        <div className="page">
            <div className="mb-8">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Übersicht aller MSP-Dokumentationen</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map(stat => (
                    <Link
                        key={stat.label}
                        to={stat.link}
                        className="card p-5 group flex items-start gap-4"
                    >
                        <div className={`p-2.5 rounded-lg ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            {statsLoading ? (
                                <Loader2 size={20} className="animate-spin text-slate-400" />
                            ) : (
                                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                            )}
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">{stat.label}</p>
                        </div>
                        <ArrowUpRight size={14} className="ml-auto text-slate-400 dark:text-slate-500 group-hover:text-primary-500 transition-colors" />
                    </Link>
                ))}
            </div>

            {/* Recent Changes */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock size={16} className="text-slate-500 dark:text-slate-400" />
                        Letzte Änderungen
                    </h2>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {activityLoading ? (
                        <div className="px-5 py-8 text-center">
                            <Loader2 size={20} className="animate-spin text-slate-400 mx-auto" />
                        </div>
                    ) : activity && activity.length > 0 ? (
                        activity.map((entry, idx) => (
                            <div key={idx} className="px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {entry.name} {entry.action === 'created' ? 'erstellt' : 'aktualisiert'}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {entry.tenantName ?? 'Global'} · {entry.type === 'device' ? 'Gerät' : entry.type === 'subnet' ? 'Subnetz' : 'IP-Adresse'}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-[11px] text-slate-500 dark:text-slate-500">
                                        {new Date(entry.timestamp).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-5 py-8 text-center text-sm text-slate-400">
                            Noch keine Änderungen vorhanden
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
