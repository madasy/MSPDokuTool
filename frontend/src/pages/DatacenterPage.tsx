import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatacenterService, type PublicIpRange, type IpAssignment, type UpdateAssignmentRequest } from '../services/DatacenterService';
import { cn } from '../lib/utils';
import { Globe, ChevronRight, Plus, Loader2, Trash2, X } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

const STATUS_COLORS: Record<string, string> = {
    free: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
    assigned: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    reserved: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    network: 'bg-slate-300 text-slate-600 cursor-default',
    broadcast: 'bg-slate-300 text-slate-600 cursor-default',
};

function lastOctet(ip: string): string {
    return '.' + (ip.split('.').pop() ?? ip);
}

export default function DatacenterPage() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [selectedRange, setSelectedRange] = useState<PublicIpRange | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingIp, setEditingIp] = useState<IpAssignment | null>(null);

    const { data: ranges, isLoading } = useQuery({
        queryKey: ['datacenter', 'ip-ranges'],
        queryFn: DatacenterService.getAll,
    });

    const active = selectedRange ?? ranges?.[0] ?? null;

    const { data: assignments, isLoading: assignmentsLoading } = useQuery({
        queryKey: ['datacenter', 'assignments', active?.id],
        queryFn: () => DatacenterService.getAssignments(active!.id),
        enabled: !!active,
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

    const generateMutation = useMutation({
        mutationFn: (rangeId: string) => DatacenterService.generateIps(rangeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datacenter', 'assignments', active?.id] });
            addToast({ type: 'success', title: 'IPs generiert' });
        },
    });

    const updateAssignmentMutation = useMutation({
        mutationFn: ({ ipAddress, data }: { ipAddress: string; data: UpdateAssignmentRequest }) =>
            DatacenterService.updateAssignment(active!.id, ipAddress, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['datacenter', 'assignments', active?.id] });
            setEditingIp(null);
            addToast({ type: 'success', title: 'IP aktualisiert' });
        },
    });

    const freeCount = assignments?.filter(a => a.status === 'free').length ?? 0;
    const assignedCount = assignments?.filter(a => a.status === 'assigned').length ?? 0;
    const reservedCount = assignments?.filter(a => a.status === 'reserved').length ?? 0;

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
                        {/* Header */}
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

                        <div className="flex-1 overflow-auto p-6 space-y-4">
                            {/* Details card */}
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

                            {/* IP Grid card */}
                            <div className="card p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-slate-700">IP-Adressen</h3>
                                    {assignments && assignments.length > 0 && (
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block w-3 h-3 rounded bg-slate-100 border border-slate-200"></span>
                                                Frei: <strong className="text-slate-700">{freeCount}</strong>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-200"></span>
                                                Belegt: <strong className="text-slate-700">{assignedCount}</strong>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-200"></span>
                                                Reserviert: <strong className="text-slate-700">{reservedCount}</strong>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {assignmentsLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 size={20} className="animate-spin text-slate-400" />
                                    </div>
                                ) : assignments && assignments.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {assignments.map(a => (
                                            <button
                                                key={a.id}
                                                title={`${a.ipAddress}${a.assignedTenantName ? ' — ' + a.assignedTenantName : ''}${a.description ? '\n' + a.description : ''}\nStatus: ${a.status}`}
                                                disabled={a.status === 'network' || a.status === 'broadcast'}
                                                onClick={() => setEditingIp(a)}
                                                className={cn(
                                                    'w-12 h-10 rounded text-xs font-mono font-semibold border transition-colors',
                                                    STATUS_COLORS[a.status] ?? STATUS_COLORS.free,
                                                    a.status === 'network' || a.status === 'broadcast'
                                                        ? 'border-slate-200'
                                                        : 'border-transparent'
                                                )}
                                            >
                                                {lastOctet(a.ipAddress)}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                                        <p className="text-sm text-slate-400">Noch keine IPs generiert</p>
                                        <button
                                            onClick={() => generateMutation.mutate(active.id)}
                                            disabled={generateMutation.isPending}
                                            className="btn-primary text-xs"
                                        >
                                            {generateMutation.isPending
                                                ? <><Loader2 size={14} className="animate-spin inline mr-1" />Generiere...</>
                                                : 'IPs generieren'}
                                        </button>
                                    </div>
                                )}
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

            {/* Edit IP Assignment Modal */}
            {editingIp && (
                <EditIpModal
                    assignment={editingIp}
                    onClose={() => setEditingIp(null)}
                    onSubmit={(data) => updateAssignmentMutation.mutate({ ipAddress: editingIp.ipAddress, data })}
                    isSubmitting={updateAssignmentMutation.isPending}
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

function EditIpModal({ assignment, onClose, onSubmit, isSubmitting }: {
    assignment: IpAssignment;
    onClose: () => void;
    onSubmit: (data: UpdateAssignmentRequest) => void;
    isSubmitting: boolean;
}) {
    const [status, setStatus] = useState(assignment.status);
    const [description, setDescription] = useState(assignment.description ?? '');

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-96" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800 font-mono">{assignment.ipAddress}</h3>
                    <button onClick={onClose} className="btn-icon"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Status</label>
                        <select className="input" value={status} onChange={e => setStatus(e.target.value as IpAssignment['status'])}>
                            <option value="free">Frei</option>
                            <option value="assigned">Belegt</option>
                            <option value="reserved">Reserviert</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Beschreibung</label>
                        <input
                            className="input"
                            placeholder="z.B. Firewall WAN, Kunde XY..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                    {assignment.assignedTenantName && (
                        <div className="text-xs text-slate-500">
                            Tenant: <strong>{assignment.assignedTenantName}</strong>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onClose} className="btn-secondary text-xs">Abbrechen</button>
                    <button
                        onClick={() => onSubmit({ status, description: description || undefined })}
                        disabled={isSubmitting}
                        className="btn-primary text-xs"
                    >
                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Speichern'}
                    </button>
                </div>
            </div>
        </div>
    );
}
