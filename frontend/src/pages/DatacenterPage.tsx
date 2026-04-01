import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatacenterService, type PublicIpRange } from '../services/DatacenterService';
import { cn } from '../lib/utils';
import { Globe, ChevronRight, Plus, Loader2, Trash2, X } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export default function DatacenterPage() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [selectedRange, setSelectedRange] = useState<PublicIpRange | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: ranges, isLoading } = useQuery({
        queryKey: ['datacenter', 'ip-ranges'],
        queryFn: DatacenterService.getAll,
    });

    const deleteMutation = useMutation({
        mutationFn: DatacenterService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datacenter', 'ip-ranges'] });
            setSelectedRange(null);
            addToast({ type: 'success', title: 'IP Range gelöscht' });
        },
    });

    const createMutation = useMutation({
        mutationFn: DatacenterService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datacenter', 'ip-ranges'] });
            setShowCreateModal(false);
            addToast({ type: 'success', title: 'IP Range erstellt' });
        },
    });

    const active = selectedRange ?? ranges?.[0] ?? null;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Left: Range List */}
            <div className="w-72 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Globe size={16} className="text-primary-500" />
                            IP Ranges
                        </h2>
                        <button className="btn-icon text-primary-500" onClick={() => setShowCreateModal(true)}>
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {ranges && ranges.length > 0 ? ranges.map(range => (
                        <button
                            key={range.id}
                            onClick={() => setSelectedRange(range)}
                            className={cn(
                                'w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 transition-colors',
                                active?.id === range.id
                                    ? 'bg-primary-50 border-l-2 border-l-primary-400'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            )}
                        >
                            <div className="flex-1">
                                <p className="text-sm font-mono font-semibold text-slate-800">{range.cidr}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{range.description ?? range.provider ?? 'Kein Beschrieb'}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                        </button>
                    )) : (
                        <div className="p-6 text-center text-sm text-slate-400">
                            Keine IP Ranges vorhanden
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Detail */}
            <div className="flex-1 flex flex-col min-w-0">
                {active ? (
                    <>
                        <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800 font-mono">{active.cidr}</h2>
                                <p className="text-xs text-slate-500">{active.description}</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                                <span>Status: <strong>{active.status}</strong></span>
                                {active.provider && <span>Provider: <strong>{active.provider}</strong></span>}
                                {active.assignedTenantName && <span>Tenant: <strong>{active.assignedTenantName}</strong></span>}
                                <button
                                    onClick={() => deleteMutation.mutate(active.id)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                    title="Löschen"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            <div className="card p-6">
                                <h3 className="text-sm font-semibold text-slate-700 mb-4">Details</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><span className="text-slate-500">CIDR:</span> <span className="font-mono font-semibold">{active.cidr}</span></div>
                                    <div><span className="text-slate-500">Status:</span> <span className="font-semibold">{active.status}</span></div>
                                    <div><span className="text-slate-500">Provider:</span> <span>{active.provider ?? '-'}</span></div>
                                    <div><span className="text-slate-500">Tenant:</span> <span>{active.assignedTenantName ?? 'Nicht zugewiesen'}</span></div>
                                    <div><span className="text-slate-500">Erstellt:</span> <span>{active.createdAt ? new Date(active.createdAt).toLocaleDateString('de-CH') : '-'}</span></div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                        Wähle eine IP Range aus oder erstelle eine neue
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateRangeModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={(data) => createMutation.mutate(data)}
                    isSubmitting={createMutation.isPending}
                />
            )}
        </div>
    );
}

function CreateRangeModal({ onClose, onSubmit, isSubmitting }: {
    onClose: () => void;
    onSubmit: (data: { cidr: string; description?: string; provider?: string; status?: string }) => void;
    isSubmitting: boolean;
}) {
    const [cidr, setCidr] = useState('');
    const [description, setDescription] = useState('');
    const [provider, setProvider] = useState('');

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">Neue IP Range</h3>
                    <button onClick={onClose} className="btn-icon"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">CIDR *</label>
                        <input className="input" placeholder="203.0.113.0/24" value={cidr} onChange={e => setCidr(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Beschreibung</label>
                        <input className="input" placeholder="Primary Block" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Provider</label>
                        <input className="input" placeholder="Swisscom" value={provider} onChange={e => setProvider(e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="btn-secondary text-xs">Abbrechen</button>
                    <button
                        onClick={() => onSubmit({ cidr, description: description || undefined, provider: provider || undefined })}
                        disabled={!cidr || isSubmitting}
                        className="btn-primary text-xs"
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Erstellen'}
                    </button>
                </div>
            </div>
        </div>
    );
}
