import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Key, Plus, Trash2, Copy, Check, Loader2, ChevronDown, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { AgentService, type AgentReport, type AgentKey, type CreateKeyResponse } from '../services/AgentService';

type Tab = 'inventory' | 'keys';

function isOnline(reportedAt: string): boolean {
    const diff = Date.now() - new Date(reportedAt).getTime();
    return diff < 10 * 60 * 1000; // 10 minutes
}

function formatUptime(seconds: number | null): string {
    if (seconds === null) return '—';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function ProgressBar({ used, total, unit }: { used: number | null; total: number | null; unit: string }) {
    if (used === null || total === null || total === 0) return <span className="text-slate-400 text-xs">—</span>;
    const pct = Math.round((used / total) * 100);
    const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary-500';
    return (
        <div className="min-w-[100px]">
            <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                <span>{used}{unit} / {total}{unit}</span>
                <span className={cn('font-semibold', pct > 90 ? 'text-red-500' : pct > 70 ? 'text-amber-500' : 'text-primary-600 dark:text-primary-400')}>{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function AgentRow({ report }: { report: AgentReport }) {
    const [expanded, setExpanded] = useState(false);
    const online = isOnline(report.reportedAt);

    return (
        <>
            <tr
                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => setExpanded(e => !e)}
            >
                {/* Expand toggle + Hostname */}
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        {expanded ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">{report.hostname}</p>
                            {report.linkedDeviceName && (
                                <p className="text-[11px] text-primary-600 dark:text-primary-400">&#8594; {report.linkedDeviceName}</p>
                            )}
                        </div>
                    </div>
                </td>
                {/* OS */}
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                    {report.osName ? `${report.osName}${report.osVersion ? ` ${report.osVersion}` : ''}` : '—'}
                </td>
                {/* CPU */}
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                    <div className="truncate max-w-[160px]" title={report.cpuModel || undefined}>
                        {report.cpuModel || '—'}
                        {report.cpuCores && <span className="ml-1 text-xs text-slate-400">({report.cpuCores}C)</span>}
                    </div>
                </td>
                {/* RAM */}
                <td className="px-4 py-3">
                    <ProgressBar used={report.ramUsedMb} total={report.ramTotalMb} unit="MB" />
                </td>
                {/* Disk */}
                <td className="px-4 py-3">
                    <ProgressBar used={report.diskUsedGb} total={report.diskTotalGb} unit="GB" />
                </td>
                {/* IPs */}
                <td className="px-4 py-3">
                    <div className="space-y-0.5">
                        {report.ipAddresses.slice(0, 2).map((ip, i) => (
                            <p key={i} className="text-xs font-mono text-slate-600 dark:text-slate-300">{ip}</p>
                        ))}
                        {report.ipAddresses.length > 2 && (
                            <p className="text-[11px] text-slate-400">+{report.ipAddresses.length - 2} weitere</p>
                        )}
                    </div>
                </td>
                {/* Updates */}
                <td className="px-4 py-3">
                    {report.pendingUpdates !== null ? (
                        <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
                            report.pendingUpdates > 0
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        )}>
                            {report.pendingUpdates > 0 ? `${report.pendingUpdates} ausstehend` : 'Aktuell'}
                        </span>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                </td>
                {/* Status */}
                <td className="px-4 py-3">
                    <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
                        online
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', online ? 'bg-green-500' : 'bg-slate-400')} />
                        {online ? 'Online' : 'Offline'}
                    </span>
                </td>
                {/* Last Report */}
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDate(report.reportedAt)}
                </td>
            </tr>

            {/* Expanded details row */}
            {expanded && (
                <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <td colSpan={9} className="px-8 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
                            <DetailItem label="Kernel" value={report.kernel} />
                            <DetailItem label="Uptime" value={formatUptime(report.uptimeSeconds)} />
                            <DetailItem label="Agent Version" value={report.agentVersion} />
                            <DetailItem label="AV-Status" value={report.avStatus} />
                            <DetailItem label="Domain" value={report.domainJoined ? (report.domainName || 'Ja') : 'Nein'} />
                            <div>
                                <p className="text-slate-400 mb-1 font-medium">MAC-Adressen</p>
                                {report.macAddresses.length > 0
                                    ? report.macAddresses.map((mac, i) => (
                                        <p key={i} className="font-mono text-slate-700 dark:text-slate-200">{mac}</p>
                                    ))
                                    : <p className="text-slate-400">—</p>
                                }
                            </div>
                            <div>
                                <p className="text-slate-400 mb-1 font-medium">IP-Adressen</p>
                                {report.ipAddresses.length > 0
                                    ? report.ipAddresses.map((ip, i) => (
                                        <p key={i} className="font-mono text-slate-700 dark:text-slate-200">{ip}</p>
                                    ))
                                    : <p className="text-slate-400">—</p>
                                }
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
    return (
        <div>
            <p className="text-slate-400 mb-0.5 font-medium">{label}</p>
            <p className="text-slate-700 dark:text-slate-200">{value || '—'}</p>
        </div>
    );
}

/* --- API Key Modal --- */

function ApiKeyModal({ keyData, onClose }: { keyData: CreateKeyResponse; onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(keyData.apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Key size={18} className="text-primary-500" />
                        API-Key erstellt
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl flex items-start gap-2 mb-4">
                    <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                        Dieser Key wird nur einmal angezeigt. Kopiere ihn jetzt und speichere ihn sicher.
                    </p>
                </div>

                <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Name</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{keyData.name}</p>
                </div>

                <div className="mb-5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">API-Key</p>
                    <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-xl">
                        <code className="flex-1 text-xs font-mono text-slate-700 dark:text-slate-200 break-all">{keyData.apiKey}</code>
                        <button
                            onClick={handleCopy}
                            className={cn(
                                'flex-shrink-0 p-1.5 rounded-lg transition-colors',
                                copied
                                    ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            )}
                            title="Kopieren"
                        >
                            {copied ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                    </div>
                </div>

                <button onClick={onClose} className="btn-primary w-full">
                    Verstanden — Key gespeichert
                </button>
            </div>
        </div>
    );
}

/* --- Inventory Tab --- */

function InventoryTab({ tenantId }: { tenantId: string }) {
    const { data: reports = [], isLoading } = useQuery({
        queryKey: ['agent-reports', tenantId],
        queryFn: () => AgentService.getReports(tenantId),
        refetchInterval: 30_000,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2" />
                Agent-Daten laden...
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
                <Activity size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">Kein Agent verbunden</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md">
                    Erstelle einen API-Key und installiere den Agent auf deinen Systemen
                </p>
            </div>
        );
    }

    const onlineCount = reports.filter(r => isOnline(r.reportedAt)).length;

    return (
        <div>
            {/* Summary bar */}
            <div className="flex items-center gap-4 mb-4 text-sm text-slate-500 dark:text-slate-400">
                <span>{reports.length} Endpoints</span>
                <span className="text-green-600 dark:text-green-400 font-medium">{onlineCount} Online</span>
                <span>{reports.length - onlineCount} Offline</span>
            </div>

            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hostname</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">OS</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CPU</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">RAM</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Disk</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">IPs</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Updates</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Letzter Report</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map(report => (
                                <AgentRow key={report.id} report={report} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/* --- API Keys Tab --- */

function ApiKeysTab({ tenantId }: { tenantId: string }) {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [newKeyName, setNewKeyName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createdKey, setCreatedKey] = useState<CreateKeyResponse | null>(null);

    const { data: keys = [], isLoading } = useQuery({
        queryKey: ['agent-keys', tenantId],
        queryFn: () => AgentService.getKeys(tenantId),
    });

    const createMutation = useMutation({
        mutationFn: (name: string) => AgentService.createKey({ name, tenantId }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['agent-keys', tenantId] });
            setCreatedKey(data);
            setNewKeyName('');
            setShowCreateForm(false);
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler', message: 'API-Key konnte nicht erstellt werden.' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => AgentService.deleteKey(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agent-keys', tenantId] });
            addToast({ type: 'info', title: 'Gelöscht', message: 'API-Key wurde entfernt.' });
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler', message: 'API-Key konnte nicht gelöscht werden.' });
        },
    });

    function handleCreate() {
        if (!newKeyName.trim()) return;
        createMutation.mutate(newKeyName.trim());
    }

    return (
        <div>
            {createdKey && (
                <ApiKeyModal keyData={createdKey} onClose={() => setCreatedKey(null)} />
            )}

            {/* Create form */}
            {showCreateForm ? (
                <div className="card mb-5">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <Key size={16} className="text-primary-500" />
                        Neuer API-Key
                    </h3>
                    <div className="flex gap-3">
                        <input
                            className="input flex-1"
                            placeholder="Name (z.B. Server-01, Monitoring-Agent)"
                            value={newKeyName}
                            onChange={e => setNewKeyName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            autoFocus
                        />
                        <button
                            className="btn-primary flex items-center gap-2"
                            onClick={handleCreate}
                            disabled={!newKeyName.trim() || createMutation.isPending}
                        >
                            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Erstellen
                        </button>
                        <button
                            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => { setShowCreateForm(false); setNewKeyName(''); }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex justify-end mb-5">
                    <button
                        className="btn-primary flex items-center gap-2"
                        onClick={() => setShowCreateForm(true)}
                    >
                        <Plus size={16} />
                        Neuer API-Key
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 size={24} className="animate-spin mr-2" />
                    Keys laden...
                </div>
            ) : keys.length === 0 ? (
                <div className="card flex flex-col items-center justify-center py-16 text-center">
                    <Key size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">Keine API-Keys vorhanden</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">
                        Erstelle einen Key um Agents zu autorisieren.
                    </p>
                    <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreateForm(true)}>
                        <Plus size={14} />
                        Neuer API-Key
                    </button>
                </div>
            ) : (
                <div className="card overflow-hidden p-0">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Zuletzt verwendet</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Erstellt</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {keys.map((key: AgentKey) => (
                                <tr key={key.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                            <Key size={14} className="text-slate-400" />
                                            {key.name}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
                                            key.isActive
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        )}>
                                            <span className={cn('w-1.5 h-1.5 rounded-full', key.isActive ? 'bg-green-500' : 'bg-slate-400')} />
                                            {key.isActive ? 'Aktiv' : 'Inaktiv'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                        {formatDate(key.lastUsed)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                                        {formatDate(key.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => deleteMutation.mutate(key.id)}
                                            disabled={deleteMutation.isPending}
                                            className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Key löschen"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

/* --- Main Page --- */

export default function AgentPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [tab, setTab] = useState<Tab>('inventory');

    if (!tenantId) return null;

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Activity size={18} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        Agents
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Endpoint-Inventar und automatisiertes Monitoring
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                {([
                    { key: 'inventory', label: 'Inventar' },
                    { key: 'keys', label: 'API-Keys' },
                ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setTab(key)}
                        className={cn(
                            'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                            tab === key
                                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'inventory' && <InventoryTab tenantId={tenantId} />}
            {tab === 'keys' && <ApiKeysTab tenantId={tenantId} />}
        </div>
    );
}
