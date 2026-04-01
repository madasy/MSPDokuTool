import { LayoutDashboard, Network, Server, Users, LogOut, ChevronRight, Star, Globe, Search, ChevronsUpDown, Check, Building, Menu, X, StarOff, Cpu, Building2, Monitor, FileText, Wifi, Shield } from 'lucide-react';
import { NavLink, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TenantService } from '../../services/TenantService';
import { cn } from '../../lib/utils';
import CommandPalette from './CommandPalette';
import { useState, useRef, useEffect } from 'react';
import { useFavorites } from '../../hooks/useFavorites';

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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // 3. Persist selected tenant to localStorage
    useEffect(() => {
        if (tenantId) {
            localStorage.setItem('lastTenantId', tenantId);
        }
    }, [tenantId]);

    // Close mobile menu on route change
    useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

    return (
        <div className="flex h-screen font-sans overflow-hidden bg-[var(--bg)]">
            {/* Command Palette */}
            <CommandPalette />

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 bg-black/40 z-30 lg:hidden animate-fade-in" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Sidebar (Left Menu) */}
            <aside className={cn(
                'w-64 min-w-[256px] bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 z-40 border-r border-white/10 shadow-xl',
                'fixed inset-y-0 left-0 transition-transform duration-300 lg:relative lg:translate-x-0',
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            )}>
                {/* Logo */}
                <div
                    className="h-16 flex items-center px-6 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => navigate('/')}
                >
                    <div className="font-semibold text-white text-lg tracking-tight flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">D</div>
                        <div className="flex flex-col leading-tight">
                            <span>Doku</span>
                            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">MSP Suite</span>
                        </div>
                    </div>
                </div>

                {/* Tenant Switcher */}
                <div className="px-4 pt-4 pb-2">
                    <TenantSwitcher
                        tenants={tenants || []}
                        currentTenant={currentTenant}
                        onSelect={(t) => navigate(`/tenants/${t.id}`)}
                    />
                </div>

                {/* Search / CMD+K */}
                <div className="px-4 pt-2 pb-2">
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
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 sidebar-scroll">

                    {/* Global nav — always visible */}
                    <div className="space-y-1">
                        <NavItem to="/" icon={<LayoutDashboard size={18} />} label="Dashboard" end />
                        <NavItem to="/tenants" icon={<Users size={18} />} label="Tenants" />
                        <NavItem to="/datacenter" icon={<Globe size={18} />} label="Datacenter / IPs" />
                    </div>

                    {/* Tenant-scoped nav — only when a tenant is selected */}
                    {isInTenantContext && (
                        <div>
                            <div className="border-t border-white/10 mb-3" />
                            <SectionHeader label="Kunde" />
                            <div className="space-y-1 mt-2">
                                <NavItem to={`/tenants/${tenantId}`} icon={<LayoutDashboard size={18} />} label="Übersicht" end />
                                <NavItem to={`/tenants/${tenantId}/sites`} icon={<Building2 size={18} />} label="Standorte" />
                                <NavItem to={`/tenants/${tenantId}/hardware`} icon={<Cpu size={18} />} label="Hardware" />
                                <NavItem to={`/tenants/${tenantId}/racks`} icon={<Server size={18} />} label="Racks" />
                                <NavItem to={`/tenants/${tenantId}/network`} icon={<Network size={18} />} label="IP-Plan" />
                                <NavItem to={`/tenants/${tenantId}/switches`} icon={<Monitor size={18} />} label="Switches" />
                                <NavItem to={`/tenants/${tenantId}/firewall`} icon={<Shield size={18} />} label="Firewall" />
                                <NavItem to={`/tenants/${tenantId}/access-points`} icon={<Wifi size={18} />} label="Access Points" />
                                <NavItem to={`/tenants/${tenantId}/docs`} icon={<FileText size={18} />} label="Dokumentation" />
                            </div>
                        </div>
                    )}

                    {/* Favorites */}
                    <div className="border-t border-white/10 pt-3">
                        <FavoritesSidebar />
                    </div>

                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => {
                            fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
                                .then(() => { window.location.href = '/.authelia/#/logout'; })
                                .catch(() => { window.location.href = '/.authelia/#/logout'; });
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-xs text-white/50 hover:text-white transition-colors rounded-xl hover:bg-white/5 font-medium cursor-pointer"
                    >
                        <LogOut size={16} />
                        <span>Abmelden</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 h-full bg-[var(--bg)] dark:bg-slate-900 relative">

                {/* Header — simplified: breadcrumbs + user profile only */}
                <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-10 sticky top-0">
                    {/* Left: Hamburger + Breadcrumbs */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <Breadcrumbs />
                    </div>

                    {/* Right: User Profile */}
                    <div className="flex items-center">
                        <UserProfile />
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-auto p-0 relative scroll-smooth">
                    <div className="min-h-full">
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
                    "w-full flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-xl border transition-all text-xs font-medium",
                    currentTenant
                        ? "bg-white/10 border-white/10 text-white hover:border-white/20 hover:bg-white/15"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300"
                )}
            >
                <div className={cn(
                    "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                    currentTenant ? "bg-primary-500/30 text-primary-300" : "bg-white/10 text-slate-400"
                )}>
                    {currentTenant ? currentTenant.name.substring(0, 2).toUpperCase() : <Building size={12} />}
                </div>

                <span className="flex-1 text-left truncate">
                    {currentTenant ? currentTenant.name : "Tenant auswählen..."}
                </span>

                <ChevronsUpDown size={14} className="opacity-50 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-xl shadow-2xl border border-white/10 py-1 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-900/50 border-b border-white/5">
                        Tenants ({tenants.length})
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        {tenants.map(tenant => (
                            <button
                                key={tenant.id}
                                onClick={() => {
                                    onSelect(tenant);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-white/5 transition-colors text-left group",
                                    currentTenant?.id === tenant.id && "bg-primary-500/10"
                                )}
                            >
                                <div className={cn(
                                    "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-colors flex-shrink-0",
                                    currentTenant?.id === tenant.id
                                        ? "bg-primary-500/30 text-primary-300"
                                        : "bg-white/10 text-slate-400 group-hover:bg-white/15"
                                )}>
                                    {tenant.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={cn("font-medium truncate", currentTenant?.id === tenant.id ? "text-primary-300" : "text-slate-200")}>
                                        {tenant.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate">{tenant.identifier}</div>
                                </div>
                                {currentTenant?.id === tenant.id && <Check size={14} className="text-primary-400 flex-shrink-0" />}
                            </button>
                        ))}
                    </div>
                    <div className="p-2 border-t border-white/5 bg-slate-900/30">
                        <NavLink
                            to="/tenants"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-center gap-2 w-full py-1.5 text-xs text-slate-400 hover:text-primary-400 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all font-medium"
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
    const queryClient = useQueryClient();
    const parts = location.pathname.split('/').filter(Boolean);

    const labels: Record<string, string> = {
        tenants: 'Tenants',
        datacenter: 'Datacenter',
        racks: 'Racks',
        network: 'IP-Plan',
        settings: 'Einstellungen',
    };

    // Look up tenant name from cache for breadcrumb display
    const tenants = queryClient.getQueryData<any[]>(['tenants']);

    const crumbs = parts.map(p => {
        if (labels[p]) return labels[p];
        // Check if this is a tenant ID and resolve to name
        const tenant = tenants?.find(t => t.id === p);
        if (tenant) return tenant.name;
        return p;
    });

    if (crumbs.length === 0) return <span className="text-sm font-semibold text-slate-900 dark:text-white">Dashboard</span>;

    return (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <NavLink to="/" className="hover:text-slate-800 dark:hover:text-white transition-colors">
                <LayoutDashboard size={14} />
            </NavLink>
            {crumbs.map((crumb, idx) => (
                <div key={idx} className="flex items-center gap-2">
                    <ChevronRight size={12} className="opacity-40" />
                    <span className={cn(idx === crumbs.length - 1 ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-500 capitalize')}>{crumb}</span>
                </div>
            ))}
        </div>
    );
}

function FavoritesSidebar() {
    const { favorites, removeFavorite } = useFavorites();
    const navigate = useNavigate();

    return (
        <div>
            <SectionHeader icon={<Star size={12} />} label="Favoriten" />
            {favorites.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-white/30 italic">
                    Keine Favoriten gepinnt
                </div>
            ) : (
                <div className="space-y-0.5 mt-1">
                    {favorites.map(fav => (
                        <div key={fav.id} className="group flex items-center">
                            <button
                                onClick={() => navigate(fav.path)}
                                className="flex-1 flex items-center gap-2 px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors truncate"
                            >
                                <Star size={12} className="text-amber-400 flex-shrink-0" />
                                <span className="truncate">{fav.label}</span>
                            </button>
                            <button
                                onClick={() => removeFavorite(fav.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 mr-2 text-white/30 hover:text-white/60 transition-all"
                                title="Entfernen"
                            >
                                <StarOff size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
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
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-400 rounded-r-full"></div>
                    )}
                </>
            )}
        </NavLink>
    );
}

function UserProfile() {
    const { data: user } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: () => fetch('/api/v1/auth/me').then(r => r.ok ? r.json() : null),
        staleTime: 60000,
        retry: false,
    });

    const displayName = user?.displayName || user?.username || 'User';
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
    const groups = (user?.groups as string[]) || [];
    const role = groups.includes('admins') ? 'Admin' : groups.includes('technicians') ? 'Techniker' : 'User';

    return (
        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 p-1.5 pr-4 rounded-full transition-colors border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700">
            <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 flex items-center justify-center text-xs font-bold border border-primary-200 dark:border-primary-800">
                {initials}
            </div>
            <div className="hidden md:block text-xs text-left">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{displayName}</p>
                <p className="text-slate-400 font-medium text-[10px]">{role}</p>
            </div>
        </div>
    );
}
