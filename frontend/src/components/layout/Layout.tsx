import { LayoutDashboard, Network, Server, Users, Settings, LogOut, ChevronRight, Star, Globe, Search, ChevronsUpDown, Check, Building } from 'lucide-react';
import { NavLink, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TenantService } from '../../services/TenantService';
import { cn } from '../../lib/utils';
import CommandPalette from './CommandPalette';
import { useState, useRef, useEffect } from 'react';

export default function Layout() {
    const location = useLocation();
    const params = useParams();
    const navigate = useNavigate();

    // 1. Determine Tenant Context
    const tenantId = params.tenantId || (location.pathname.startsWith('/tenants/') ? location.pathname.split('/')[2] : null);
    const isInTenantContext = tenantId && tenantId !== '' && !['create'].includes(tenantId);

    // 2. Fetch Tenants for Switcher
    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
    });

    const currentTenant = tenants?.find(t => t.id === tenantId);

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-slate-50">
            {/* Command Palette */}
            <CommandPalette />

            {/* Sidebar (Left Menu) */}
            <aside className="w-64 min-w-[256px] bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 z-20 border-r border-white/10 shadow-xl">
                {/* Logo */}
                <div
                    className="h-16 flex items-center px-6 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => navigate('/')}
                >
                    <div className="font-semibold text-white text-lg tracking-tight flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-[0_0_20px_rgba(20,184,166,0.3)]" />
                        <div className="flex flex-col leading-tight">
                            <span>Doku</span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">MSP Suite</span>
                        </div>
                    </div>
                </div>

                {/* Search / CMD+K */}
                <div className="px-4 pt-6 pb-2">
                    <button
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-400 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all shadow-sm group"
                        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                    >
                        <Search size={14} className="group-hover:text-white transition-colors" />
                        <span className="flex-1 text-left group-hover:text-slate-200 transition-colors">Suche...</span>
                        <kbd className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-lg group-hover:text-white/80 transition-colors">⌘K</kbd>
                    </button>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-8 sidebar-scroll">

                    {/* Mode: Tenant Context */}
                    {isInTenantContext ? (
                        <>
                            <div>
                                <SectionHeader label="Tenant Menu" />
                                <div className="space-y-1 mt-2">
                                    <NavItem to={`/tenants/${tenantId}`} icon={<LayoutDashboard size={18} />} label="Übersicht" end />
                                </div>
                            </div>

                            <div>
                                <SectionHeader label="Infrastruktur" />
                                <div className="space-y-1 mt-2">
                                    <NavItem to={`/tenants/${tenantId}/racks`} icon={<Server size={18} />} label="Racks & Hardware" />
                                </div>
                            </div>

                            <div>
                                <SectionHeader label="Netzwerk" />
                                <div className="space-y-1 mt-2">
                                    <NavItem to={`/tenants/${tenantId}/network`} icon={<Network size={18} />} label="IP-Plan & Ranges" />
                                </div>
                            </div>

                            <div className="pt-6 mt-2 border-t border-white/10">
                                <NavItem to="/tenants" icon={<Users size={18} />} label="Alle Tenants" />
                            </div>
                        </>
                    ) : (
                        /* Mode: Global Context */
                        <>
                            <div className="space-y-1">
                                <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" end />
                                <NavItem to="/tenants" icon={<Users size={18} />} label="Tenants" />
                                <NavItem to="/datacenter" icon={<Globe size={18} />} label="Datacenter / IPs" />
                            </div>

                            <div>
                                <SectionHeader icon={<Star size={12} />} label="Favoriten" />
                                <div className="px-3 py-3 text-[11px] text-white/30 italic">
                                    Keine Favoriten gepinnt
                                </div>
                            </div>
                        </>
                    )}

                    {/* Settings (Always visible) */}
                    <div className="mt-auto">
                        <NavItem to="/settings" icon={<Settings size={18} />} label="Einstellungen" />
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <button className="flex items-center gap-3 w-full px-3 py-2.5 text-xs text-white/50 hover:text-white transition-colors rounded-xl hover:bg-white/5 font-medium">
                        <LogOut size={16} />
                        <span>Abmelden</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-full bg-slate-50 relative">

                {/* Header with Tenant Switcher (Top Right) */}
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 shadow-sm flex-shrink-0 z-10 sticky top-0">
                    {/* Left: Breadcrumbs */}
                    <Breadcrumbs />

                    {/* Right: Tenant Switcher & User */}
                    <div className="flex items-center gap-5">

                        {/* Tenant Switcher Dropdown */}
                        <TenantSwitcher
                            tenants={tenants || []}
                            currentTenant={currentTenant}
                            onSelect={(t) => navigate(`/tenants/${t.id}`)}
                        />

                        <div className="h-8 w-[1px] bg-slate-200/80"></div>

                        {/* User Profile */}
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100/80 p-1.5 pr-4 rounded-full transition-colors border border-transparent hover:border-slate-200/50">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary-100 to-primary-50 text-primary-700 flex items-center justify-center text-xs font-bold border border-primary-100 shadow-sm">
                                AM
                            </div>
                            <div className="hidden md:block text-xs text-left">
                                <p className="font-semibold text-slate-700">Anish M.</p>
                                <p className="text-slate-400 font-medium text-[10px]">Admin</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-auto p-0 relative scroll-smooth">
                    <div className="app-shell min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

/* --- Sub-Components --- */

function TenantSwitcher({
    tenants,
    currentTenant,
    onSelect
}: {
    tenants: any[],
    currentTenant?: any,
    onSelect: (t: any) => void
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg border transition-all text-xs font-medium min-w-[180px]",
                    currentTenant
                        ? "bg-white border-slate-200 text-slate-700 hover:border-primary-300 shadow-sm"
                        : "bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100"
                )}
            >
                <div className={cn(
                    "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold",
                    currentTenant ? "bg-primary-50 text-primary-600" : "bg-slate-200 text-slate-400"
                )}>
                    {currentTenant ? currentTenant.name.substring(0, 2).toUpperCase() : <Building size={12} />}
                </div>

                <span className="flex-1 text-left truncate">
                    {currentTenant ? currentTenant.name : "Tenant auswählen..."}
                </span>

                <ChevronsUpDown size={14} className="opacity-50" />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50 border-b border-slate-50">
                        Tenants ({tenants.length})
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                        {tenants.map(tenant => (
                            <button
                                key={tenant.id}
                                onClick={() => {
                                    onSelect(tenant);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-slate-50 transition-colors text-left group",
                                    currentTenant?.id === tenant.id && "bg-primary-50/50"
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors",
                                    currentTenant?.id === tenant.id
                                        ? "bg-primary-100 text-primary-700 shadow-sm"
                                        : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm"
                                )}>
                                    {tenant.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className={cn("font-medium", currentTenant?.id === tenant.id ? "text-primary-900" : "text-slate-700")}>
                                        {tenant.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono truncate">{tenant.identifier}</div>
                                </div>
                                {currentTenant?.id === tenant.id && <Check size={14} className="text-primary-500" />}
                            </button>
                        ))}
                    </div>
                    <div className="p-2 border-t border-slate-50 bg-slate-50/30">
                        <NavLink
                            to="/tenants"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center gap-2 w-full py-1.5 text-xs text-slate-500 hover:text-primary-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all font-medium"
                        >
                            <Users size={12} />
                            Alle verwalten
                        </NavLink>
                    </div>
                </div>
            )}
        </div>
    );
}

function Breadcrumbs() {
    const location = useLocation();
    const parts = location.pathname.split('/').filter(Boolean);

    const labels: Record<string, string> = {
        tenants: 'Tenants',
        datacenter: 'Datacenter',
        racks: 'Racks',
        network: 'IP-Plan',
        settings: 'Einstellungen',
    };

    const crumbs = parts.map(p => labels[p] || p);
    // If empty (home), just show Dashboard
    if (crumbs.length === 0) return <span className="text-sm font-semibold text-slate-900">Dashboard</span>;

    return (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <NavLink to="/" className="hover:text-slate-800 transition-colors">
                <LayoutDashboard size={14} />
            </NavLink>
            {crumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-2">
                    <ChevronRight size={12} className="opacity-40" />
                    <span className={cn(idx === crumbs.length - 1 ? 'font-semibold text-slate-900' : 'text-slate-500 capitalize')}>{crumb}</span>
                </div>
            ))}
        </div>
    );
}

function SectionHeader({ label, icon }: { label: string; icon?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-1.5 px-3 pt-1 pb-1 text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em]">
            {icon}
            {label}
        </div>
    );
}

function NavItem({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                cn(
                    'flex items-center gap-3 px-3 py-2 text-[13px] font-medium transition-all rounded-xl group relative',
                    isActive
                        ? 'bg-gradient-to-r from-primary-500/20 to-primary-500/5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                )
            }
        >
            {({ isActive }) => (
                <>
                    <span className={cn("transition-colors", isActive ? "text-primary-300" : "text-slate-400 group-hover:text-slate-200")}>
                        {icon}
                    </span>
                    <span>{label}</span>
                    {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary-400 rounded-r-full shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
                    )}
                </>
            )}
        </NavLink>
    );
}
