import { Activity, Server, Users, Network, AlertTriangle, Clock, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock data for global dashboard
const STATS = [
    { label: 'Tenants', value: 12, icon: <Users size={20} />, color: 'text-sky-700 bg-sky-100', link: '/tenants' },
    { label: 'Geräte', value: 248, icon: <Server size={20} />, color: 'text-emerald-700 bg-emerald-100', link: '/tenants' },
    { label: 'Subnetze', value: 34, icon: <Network size={20} />, color: 'text-cyan-700 bg-cyan-100', link: '/datacenter' },
    { label: 'Offene Aufgaben', value: 5, icon: <AlertTriangle size={20} />, color: 'text-amber-700 bg-amber-100', link: '#' },
];

const RECENT_CHANGES = [
    { what: 'Firewall-01 neu zugewiesen', who: 'Patrick R.', when: 'vor 12 Min.', tenant: 'Kanzlei Müller' },
    { what: 'Subnet 10.0.5.0/24 erstellt', who: 'Admin', when: 'vor 1 Std.', tenant: 'Acme GmbH' },
    { what: 'Switch-Port 12 umgesteckt', who: 'Patrick R.', when: 'vor 3 Std.', tenant: 'Kanzlei Müller' },
    { what: 'ESXi-Host-02 hinzugefügt', who: 'Admin', when: 'gestern', tenant: 'Logistik AG' },
    { what: 'Public IP .15 reserviert', who: 'Admin', when: 'gestern', tenant: 'Kanzlei Müller' },
];

const STATUS_ITEMS = [
    { label: 'Backend API', status: 'ok' as const },
    { label: 'Datenbank', status: 'ok' as const },
    { label: 'SSL Zertifikat', status: 'warning' as const, detail: 'Läuft in 14 Tagen ab' },
    { label: 'Backup', status: 'ok' as const },
];

export default function DashboardPage() {
    return (
        <div className="page">
            <div className="mb-8">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Übersicht aller MSP-Dokumentationen</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {STATS.map(stat => (
                    <Link
                        key={stat.label}
                        to={stat.link}
                        className="card p-5 group flex items-start gap-4"
                    >
                        <div className={`p-2.5 rounded-lg ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
                        </div>
                        <ArrowUpRight size={14} className="ml-auto text-slate-300 group-hover:text-primary-500 transition-colors" />
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Changes */}
                <div className="lg:col-span-2 card overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/70 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            Letzte Änderungen
                        </h2>
                    </div>
                    <div className="divide-y divide-white/70">
                        {RECENT_CHANGES.map((change, idx) => (
                            <div key={idx} className="px-5 py-3 hover:bg-white/70 transition-colors flex items-center gap-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{change.what}</p>
                                    <p className="text-xs text-slate-400">{change.tenant}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-slate-500">{change.who}</p>
                                    <p className="text-[11px] text-slate-400">{change.when}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Ampeln */}
                <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/70">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Activity size={16} className="text-slate-400" />
                            System Status
                        </h2>
                    </div>
                    <div className="p-5 space-y-3">
                        {STATUS_ITEMS.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-2 h-2 rounded-full ${item.status === 'ok' ? 'bg-green-500' :
                                            item.status === 'warning' ? 'bg-amber-500 animate-pulse' :
                                                'bg-red-500'
                                        }`} />
                                    <span className="text-sm text-slate-700">{item.label}</span>
                                </div>
                                {item.detail && (
                                    <span className="text-[11px] text-amber-600 font-medium">{item.detail}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
