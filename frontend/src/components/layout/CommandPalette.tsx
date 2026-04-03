import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, X, Cpu, Network, Hash, Building, Server, Layers, Users, FileText, Loader2,
} from 'lucide-react';
import { SearchService, SearchResult } from '../../services/SearchService';

const TYPE_LABELS: Record<string, string> = {
    device: 'Gerät',
    subnet: 'Subnetz',
    ip_address: 'IP-Adresse',
    site: 'Standort',
    rack: 'Rack',
    vlan: 'VLAN',
    tenant: 'Tenant',
    documentation: 'Dokumentation',
};

function TypeIcon({ type }: { type: string }) {
    const cls = 'shrink-0 text-slate-400';
    switch (type) {
        case 'device':        return <Cpu size={16} className={cls} />;
        case 'subnet':        return <Network size={16} className={cls} />;
        case 'ip_address':    return <Hash size={16} className={cls} />;
        case 'site':          return <Building size={16} className={cls} />;
        case 'rack':          return <Server size={16} className={cls} />;
        case 'vlan':          return <Layers size={16} className={cls} />;
        case 'tenant':        return <Users size={16} className={cls} />;
        case 'documentation': return <FileText size={16} className={cls} />;
        default:              return <Search size={16} className={cls} />;
    }
}

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // CMD+K / Escape shortcut
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

    // Auto-focus input and reset state when opened/closed
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSelectedIndex(0);
        } else {
            setQuery('');
            setDebouncedQuery('');
            setResults([]);
            setTotalResults(0);
        }
    }, [open]);

    // Debounce query
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    // Reset selection when query changes
    useEffect(() => { setSelectedIndex(0); }, [query]);

    // Fetch results when debounced query changes
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setResults([]);
            setTotalResults(0);
            return;
        }
        let cancelled = false;
        setLoading(true);
        SearchService.search(debouncedQuery)
            .then(data => {
                if (!cancelled) {
                    setResults(data.results);
                    setTotalResults(data.totalResults);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setResults([]);
                    setTotalResults(0);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [debouncedQuery]);

    // Group results by type
    const grouped = results.reduce((acc, r) => {
        const key = r.type;
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
    }, {} as Record<string, SearchResult[]>);

    // Flat list for keyboard navigation
    const flatItems = Object.values(grouped).flat();

    const handleSelect = useCallback((result: SearchResult) => {
        navigate(result.link);
        setOpen(false);
    }, [navigate]);

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
                handleSelect(flatItems[selectedIndex]);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, selectedIndex, flatItems, handleSelect]);

    // Scroll active item into view
    useEffect(() => {
        const activeEl = listRef.current?.querySelector('[data-active="true"]');
        activeEl?.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    if (!open) return null;

    let itemIndex = -1;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
            onClick={() => setOpen(false)}
        >
            {/* Modal */}
            <div
                className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 border-b border-slate-200 dark:border-slate-700">
                    {loading
                        ? <Loader2 size={18} className="text-slate-400 shrink-0 animate-spin" />
                        : <Search size={18} className="text-slate-400 shrink-0" />
                    }
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Suche..."
                        className="flex-1 bg-transparent outline-none py-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400"
                    />
                    <button
                        onClick={() => setOpen(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Results List */}
                <div ref={listRef} className="max-h-96 overflow-y-auto py-2">
                    {debouncedQuery.trim() && !loading && results.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">
                            Keine Ergebnisse für &quot;{debouncedQuery}&quot;
                        </div>
                    )}

                    {!debouncedQuery.trim() && (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">
                            Suchbegriff eingeben…
                        </div>
                    )}

                    {Object.entries(grouped).map(([type, items]) => (
                        <div key={type}>
                            {/* Group header */}
                            <div className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                {TYPE_LABELS[type] ?? type}
                            </div>

                            {items.map(item => {
                                itemIndex++;
                                const isActive = itemIndex === selectedIndex;
                                return (
                                    <button
                                        key={`${item.type}-${item.id}`}
                                        data-active={isActive}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                                            isActive
                                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                                                : 'text-slate-700 dark:text-slate-300 hover:bg-primary-50/70 dark:hover:bg-primary-900/10'
                                        }`}
                                    >
                                        <TypeIcon type={item.type} />
                                        <span className="flex-1 min-w-0">
                                            <span className="block truncate font-medium">{item.title}</span>
                                            {item.subtitle && (
                                                <span className="block truncate text-xs text-slate-400">{item.subtitle}</span>
                                            )}
                                        </span>
                                        {item.tenantName && (
                                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                                {item.tenantName}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-[10px] text-slate-400">
                    <span><kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">↑↓</kbd> navigieren</span>
                    <span><kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">↵</kbd> öffnen</span>
                    <span><kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[9px]">ESC</kbd> schließen</span>
                    {debouncedQuery.trim() && !loading && (
                        <span className="ml-auto">{totalResults} Ergebnis{totalResults !== 1 ? 'se' : ''}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
