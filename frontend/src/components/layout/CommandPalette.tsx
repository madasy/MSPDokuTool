import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Server, Network, Users, Monitor, X, Settings, Globe, Star, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { TenantService } from '../../services/TenantService';
import { useFavorites } from '../../hooks/useFavorites';

interface CommandAction {
    id: string;
    label: string;
    category: string;
    icon: React.ReactNode;
    action: () => void;
}

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const { favorites } = useFavorites();

    // Fetch real tenants for search
    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
        enabled: open, // Only fetch when palette is open
    });

    // CMD+K shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSelectedIndex(0);
        } else {
            setQuery('');
        }
    }, [open]);

    // Build dynamic actions list
    const actions: CommandAction[] = [
        // Quick Actions
        { id: 'add-device', label: 'Gerät hinzufügen', category: 'Schnellaktionen', icon: <Zap size={16} />, action: () => { navigate('/tenants/demo/racks'); setOpen(false); } },
        { id: 'assign-ip', label: 'Public IP zuweisen', category: 'Schnellaktionen', icon: <Network size={16} />, action: () => { navigate('/datacenter'); setOpen(false); } },

        // Navigation
        { id: 'go-dashboard', label: 'Dashboard', category: 'Navigation', icon: <Monitor size={16} />, action: () => { navigate('/'); setOpen(false); } },
        { id: 'go-tenants', label: 'Tenants', category: 'Navigation', icon: <Users size={16} />, action: () => { navigate('/tenants'); setOpen(false); } },
        { id: 'go-datacenter', label: 'Datacenter / Public IPs', category: 'Navigation', icon: <Globe size={16} />, action: () => { navigate('/datacenter'); setOpen(false); } },
        { id: 'go-settings', label: 'Einstellungen', category: 'Navigation', icon: <Settings size={16} />, action: () => { navigate('/settings'); setOpen(false); } },
    ];

    // Add dynamic tenant entries
    if (tenants) {
        tenants.forEach(t => {
            actions.push({
                id: `tenant-${t.id}`,
                label: t.name,
                category: 'Tenants',
                icon: <Users size={16} />,
                action: () => { navigate(`/tenants/${t.id}`); setOpen(false); },
            });
            // Also add racks & network shortcuts per tenant
            actions.push({
                id: `tenant-${t.id}-racks`,
                label: `${t.name} → Racks & Hardware`,
                category: 'Tenants',
                icon: <Server size={16} />,
                action: () => { navigate(`/tenants/${t.id}/racks`); setOpen(false); },
            });
            actions.push({
                id: `tenant-${t.id}-network`,
                label: `${t.name} → IP-Plan`,
                category: 'Tenants',
                icon: <Network size={16} />,
                action: () => { navigate(`/tenants/${t.id}/network`); setOpen(false); },
            });
        });
    }

    // Add favorites as searchable items
    favorites.forEach(fav => {
        actions.push({
            id: `fav-${fav.id}`,
            label: `★ ${fav.label}`,
            category: 'Favoriten',
            icon: <Star size={16} />,
            action: () => { navigate(fav.path); setOpen(false); },
        });
    });

    const filtered = query
        ? actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
        : actions;

    const grouped = filtered.reduce((acc, a) => {
        if (!acc[a.category]) acc[a.category] = [];
        acc[a.category].push(a);
        return acc;
    }, {} as Record<string, CommandAction[]>);

    // Flatten for keyboard navigation
    const flatItems = Object.values(grouped).flat();

    // Keyboard navigation
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && flatItems[selectedIndex]) {
                e.preventDefault();
                flatItems[selectedIndex].action();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, selectedIndex, flatItems]);

    // Reset selection when query changes
    useEffect(() => { setSelectedIndex(0); }, [query]);

    if (!open) return null;

    let itemIndex = -1;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" />

            {/* Panel */}
            <div
                className="relative w-full max-w-lg bg-white/85 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 dark:border-white/10 overflow-hidden animate-slide-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/60 dark:border-white/10">
                    <Search size={18} className="text-slate-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Suche Tenant, IP, Gerät, Aktion..."
                        className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 dark:text-white"
                    />
                    <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto py-2">
                    {Object.entries(grouped).map(([category, items]) => (
                        <div key={category}>
                            <div className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                {category}
                            </div>
                            {items.map(item => {
                                itemIndex++;
                                const isSelected = itemIndex === selectedIndex;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={item.action}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${isSelected
                                                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-primary-50/80 hover:text-primary-700'
                                            }`}
                                    >
                                        <span className="text-slate-400">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">
                            Keine Ergebnisse für &quot;{query}&quot;
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-white/60 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 text-[10px] text-slate-400">
                    <span><kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">↑↓</kbd> navigieren</span>
                    <span><kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">↵</kbd> öffnen</span>
                    <span><kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">ESC</kbd> schließen</span>
                    {tenants && <span className="ml-auto">{tenants.length} Tenants geladen</span>}
                </div>
            </div>
        </div>
    );
}
