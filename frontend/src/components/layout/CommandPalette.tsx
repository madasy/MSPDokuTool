import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Server, Network, Users, Monitor, X } from 'lucide-react';

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
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

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
        } else {
            setQuery('');
        }
    }, [open]);

    const actions: CommandAction[] = [
        { id: 'add-device', label: 'Gerät hinzufügen', category: 'Aktionen', icon: <Server size={16} />, action: () => { navigate('/tenants/demo/racks'); setOpen(false); } },
        { id: 'assign-ip', label: 'Public IP zuweisen', category: 'Aktionen', icon: <Network size={16} />, action: () => { navigate('/datacenter'); setOpen(false); } },
        { id: 'search-ip', label: 'IP suchen: 192.168...', category: 'Suche', icon: <Search size={16} />, action: () => { navigate('/tenants/demo/network'); setOpen(false); } },
        { id: 'go-dashboard', label: 'Dashboard', category: 'Navigation', icon: <Monitor size={16} />, action: () => { navigate('/'); setOpen(false); } },
        { id: 'go-tenants', label: 'Tenants', category: 'Navigation', icon: <Users size={16} />, action: () => { navigate('/tenants'); setOpen(false); } },
        { id: 'go-datacenter', label: 'Datacenter / Public IPs', category: 'Navigation', icon: <Network size={16} />, action: () => { navigate('/datacenter'); setOpen(false); } },
        { id: 'go-racks', label: 'Racks & Hardware', category: 'Navigation', icon: <Server size={16} />, action: () => { navigate('/tenants/demo/racks'); setOpen(false); } },
        { id: 'go-network', label: 'IP-Plan & Netzwerk', category: 'Navigation', icon: <Network size={16} />, action: () => { navigate('/tenants/demo/network'); setOpen(false); } },
    ];

    const filtered = query
        ? actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
        : actions;

    const grouped = filtered.reduce((acc, a) => {
        if (!acc[a.category]) acc[a.category] = [];
        acc[a.category].push(a);
        return acc;
    }, {} as Record<string, CommandAction[]>);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

            {/* Panel */}
            <div
                className="relative w-full max-w-lg bg-white/85 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 overflow-hidden animate-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/60">
                    <Search size={18} className="text-slate-400 flex-shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Suche nach IP, Gerät, Aktion..."
                        className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400"
                    />
                    <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
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
                            {items.map(item => (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-primary-50/80 hover:text-primary-700 transition-colors text-left"
                                >
                                    <span className="text-slate-400">{item.icon}</span>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">
                            Keine Ergebnisse für "{query}"
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-white/60 bg-white/70 text-[10px] text-slate-400">
                    <span><kbd className="px-1 py-0.5 bg-slate-200 rounded text-[9px]">↑↓</kbd> navigieren</span>
                    <span><kbd className="px-1 py-0.5 bg-slate-200 rounded text-[9px]">↵</kbd> öffnen</span>
                    <span><kbd className="px-1 py-0.5 bg-slate-200 rounded text-[9px]">ESC</kbd> schließen</span>
                </div>
            </div>
        </div>
    );
}
