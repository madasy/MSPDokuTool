import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Copy, Search, Plus, X, Check, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NetworkService, type Subnet, type IpAddress, type CreateSubnetRequest, type CreateIpAddressRequest, type UpdateIpAddressRequest } from '../services/NetworkService';

const STATUS_OPTIONS = [
    { value: 'manual', label: 'Manuell', badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    { value: 'dhcp-reservation', label: 'DHCP-Reservation', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    { value: 'free', label: 'Frei', badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' },
];

export default function NetworkPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddSubnet, setShowAddSubnet] = useState(false);
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Fetch Subnets
    const { data: subnets, isLoading, error } = useQuery({
        queryKey: ['subnets', tenantId],
        queryFn: () => NetworkService.getSubnets(tenantId!),
        enabled: !!tenantId,
    });

    // Create Subnet Mutation
    const createSubnetMutation = useMutation({
        mutationFn: (data: CreateSubnetRequest) => NetworkService.createSubnet(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subnets', tenantId] });
            setShowAddSubnet(false);
            addToast({ type: 'success', title: 'Subnet erstellt', message: 'Das Subnet wurde erfolgreich angelegt.' });
        },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler', message: err.message });
        },
    });

    const handleAddSubnet = (subnetData: Omit<CreateSubnetRequest, 'tenantId'>) => {
        if (!tenantId) return;
        createSubnetMutation.mutate({ ...subnetData, tenantId });
    };

    if (isLoading) {
        return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
    }

    if (error) {
        return <div className="p-12 text-center text-red-500">Fehler beim Laden der Subnetze: {error.message}</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-white">IP-Plan</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Netzwerk-Dokumentation · {subnets?.length || 0} Subnetze</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="IP, Hostname oder MAC..."
                            className="pl-8 pr-3 w-56 input-sm"
                        />
                    </div>
                    <button onClick={() => setShowAddSubnet(true)} className="btn-primary text-xs px-3 py-1.5">
                        <Plus size={14} />
                        Subnet
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
                {subnets?.map(subnet => (
                    <SubnetTable
                        key={subnet.id}
                        subnet={subnet}
                        searchQuery={searchQuery}
                    />
                ))}
            </div>

            {/* Add Subnet Modal */}
            {showAddSubnet && (
                <AddSubnetModal onClose={() => setShowAddSubnet(false)} onAdd={handleAddSubnet} isPending={createSubnetMutation.isPending} />
            )}
        </div>
    );
}

function SubnetTable({ subnet, searchQuery }: { subnet: Subnet; searchQuery: string }) {
    const [showAddIp, setShowAddIp] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const utilization = (subnet.usedIps / subnet.totalIps) * 100;

    // Fetch IPs for this subnet
    const { data: ips, isLoading } = useQuery({
        queryKey: ['ips', subnet.id],
        queryFn: () => NetworkService.getIps(subnet.id),
        enabled: expanded, // Only fetch when expanded
    });

    // Mutations
    const createIpMutation = useMutation({
        mutationFn: (data: CreateIpAddressRequest) => NetworkService.createIp(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ips', subnet.id] });
            queryClient.invalidateQueries({ queryKey: ['subnets'] }); // Update usage counts
            setShowAddIp(false);
            addToast({ type: 'success', title: 'IP hinzugefügt' });
        },
        onError: (err: Error) => addToast({ type: 'error', title: 'Fehler', message: err.message }),
    });

    const updateIpMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateIpAddressRequest }) => NetworkService.updateIp(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ips', subnet.id] });
            addToast({ type: 'success', title: 'IP aktualisiert' });
        },
        onError: (err: Error) => addToast({ type: 'error', title: 'Fehler', message: err.message }),
    });

    const deleteIpMutation = useMutation({
        mutationFn: (id: string) => NetworkService.deleteIp(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ips', subnet.id] });
            queryClient.invalidateQueries({ queryKey: ['subnets'] });
            addToast({ type: 'info', title: 'IP gelöscht' });
        },
        onError: (err: Error) => addToast({ type: 'error', title: 'Fehler', message: err.message }),
    });

    const handleAddIp = (ipData: Omit<CreateIpAddressRequest, 'subnetId'>) => {
        createIpMutation.mutate({ ...ipData, subnetId: subnet.id });
    };

    const filteredIps = searchQuery && ips
        ? ips.filter(ip =>
            ip.address.includes(searchQuery) ||
            ip.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ip.mac?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : ips;

    if (searchQuery && filteredIps?.length === 0) return null;

    return (
        <div className="card overflow-hidden">
            {/* Subnet Header */}
            <div className="px-5 py-3 bg-white dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <span className="font-mono font-bold text-sm text-slate-800 dark:text-white">{subnet.cidr}</span>
                    {(subnet.vlanTag || subnet.vlanId) && <span className="badge badge-ok text-[10px]">VLAN {subnet.vlanTag || subnet.vlanId} {subnet.vlanName ? `– ${subnet.vlanName}` : ''}</span>}
                    <span className="text-xs text-slate-500 dark:text-slate-400">{subnet.description}</span>
                    {subnet.gateway && <span className="text-xs text-slate-400">GW: {subnet.gateway}</span>}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{subnet.usedIps}/{subnet.totalIps} belegt</span>
                    <button onClick={() => setShowAddIp(true)} className="btn-ghost text-[10px] px-2 py-1">
                        <Plus size={12} /> IP
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="px-5 py-1.5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                    <div
                        className={cn(
                            'rounded-full transition-all',
                            utilization > 80 ? 'bg-red-400' : utilization > 50 ? 'bg-amber-400' : 'bg-green-400'
                        )}
                        style={{ width: `${utilization}%` }}
                    />
                </div>
            </div>

            {expanded && (
                <>
                    {/* Add IP inline form */}
                    {showAddIp && (
                        <AddIpRow onAdd={handleAddIp} onCancel={() => setShowAddIp(false)} subnetCidr={subnet.cidr} isPending={createIpMutation.isPending} />
                    )}

                    {/* Table */}
                    {isLoading ? (
                        <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-slate-300" size={20} /></div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                                    <th className="table-header-cell w-36">IP</th>
                                    <th className="table-header-cell">Hostname</th>
                                    <th className="table-header-cell w-40">MAC</th>
                                    <th className="table-header-cell w-36">Status</th>
                                    <th className="table-header-cell">Beschreibung</th>
                                    {/* <th className="table-header-cell w-28">Gerät</th>  Backend doesn't link devices to IPs yet */}
                                    <th className="table-header-cell w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredIps?.map(ip => (
                                    <IpTableRow
                                        key={ip.id}
                                        ip={ip}
                                        onUpdate={(data) => updateIpMutation.mutate({ id: ip.id, data })}
                                        onDelete={() => deleteIpMutation.mutate(ip.id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!isLoading && (!filteredIps || filteredIps.length === 0) && (
                        <div className="text-center py-6 text-xs text-slate-400">Keine IPs in diesem Subnet</div>
                    )}
                </>
            )}
        </div>
    );
}

function IpTableRow({ ip, onUpdate, onDelete }: { ip: IpAddress; onUpdate: (data: UpdateIpAddressRequest) => void; onDelete: () => void }) {
    const statusOption = STATUS_OPTIONS.find(s => s.value === ip.status) || STATUS_OPTIONS[0];

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
            {/* IP */}
            <td className="table-cell font-mono font-medium text-slate-800 dark:text-white">
                <div className="flex items-center gap-1.5">
                    {ip.address}
                    <button onClick={() => navigator.clipboard.writeText(ip.address)} className="copy-btn" title="IP kopieren">
                        <Copy size={12} />
                    </button>
                </div>
            </td>
            {/* Hostname */}
            <td className="table-cell">
                <InlineEditCell value={ip.hostname || ''} placeholder="–" onSave={(v) => onUpdate({ hostname: v })} />
            </td>
            {/* MAC */}
            <td className="table-cell font-mono text-xs">
                <div className="flex items-center gap-1.5">
                    <InlineEditCell value={ip.mac || ''} placeholder="–" onSave={(v) => onUpdate({ mac: v })} />
                    {ip.mac && (
                        <button onClick={() => navigator.clipboard.writeText(ip.mac!)} className="copy-btn" title="MAC kopieren">
                            <Copy size={12} />
                        </button>
                    )}
                </div>
            </td>
            {/* Status */}
            <td className="table-cell">
                <select
                    value={ip.status}
                    onChange={e => onUpdate({ status: e.target.value })}
                    className={cn(
                        'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border-0 cursor-pointer appearance-none outline-none',
                        statusOption?.badgeClass
                    )}
                >
                    {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </td>
            {/* Description */}
            <td className="table-cell">
                <InlineEditCell value={ip.description || ''} placeholder="Beschreibung eingeben..." onSave={(v) => onUpdate({ description: v })} />
            </td>
            {/* Actions */}
            <td className="table-cell">
                <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity" title="Löschen">
                    <Trash2 size={12} />
                </button>
            </td>
        </tr>
    );
}

function InlineEditCell({ value, placeholder, onSave }: { value: string; placeholder: string; onSave: (value: string) => void }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    // Update internal state if external value changes (e.g. optimistic update reverted)
    useEffect(() => {
        setText(value);
    }, [value]);

    const handleSave = () => {
        setEditing(false);
        if (text !== value) onSave(text);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onBlur={handleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setText(value); setEditing(false); } }}
                className="w-full text-sm px-1 py-0.5 border border-primary-300 dark:border-primary-600 rounded outline-none bg-primary-50/60 dark:bg-primary-900/30 dark:text-white"
            />
        );
    }

    return (
        <span onClick={() => setEditing(true)} className="inline-edit px-1 py-0.5 cursor-text text-slate-700 dark:text-slate-300 min-h-[1.5rem] min-w-[2rem] inline-block">
            {text || <span className="text-slate-300 dark:text-slate-600 italic">{placeholder}</span>}
        </span>
    );
}

function AddIpRow({ onAdd, onCancel, subnetCidr, isPending }: { onAdd: (ip: Omit<CreateIpAddressRequest, 'subnetId'>) => void; onCancel: () => void; subnetCidr: string; isPending: boolean }) {
    const [ip, setIp] = useState('');
    const [hostname, setHostname] = useState('');
    const [mac, setMac] = useState('');
    const [status, setStatus] = useState('manual');
    const [description, setDescription] = useState('');
    const prefix = subnetCidr.split('/')[0].split('.').slice(0, 3).join('.');

    const handleSubmit = () => {
        if (!ip.trim()) return;
        onAdd({
            address: ip.includes('.') ? ip : `${prefix}.${ip}`,
            hostname,
            mac,
            status,
            description,
        });
    };

    return (
        <div className="px-5 py-3 bg-primary-50/50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800/30 flex items-center gap-3">
            <input value={ip} onChange={e => setIp(e.target.value)} placeholder={`${prefix}.___`} className="input text-xs py-1 w-32 font-mono" autoFocus disabled={isPending} />
            <input value={hostname} onChange={e => setHostname(e.target.value)} placeholder="Hostname" className="input text-xs py-1 w-28" disabled={isPending} />
            <input value={mac} onChange={e => setMac(e.target.value)} placeholder="MAC" className="input text-xs py-1 w-36 font-mono" disabled={isPending} />
            <select value={status} onChange={e => setStatus(e.target.value)} className="input text-xs py-1 w-36" disabled={isPending}>
                {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Beschreibung" className="input text-xs py-1 flex-1" disabled={isPending} />
            <button onClick={handleSubmit} disabled={isPending} className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400" title="Speichern">
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button onClick={onCancel} disabled={isPending} className="p-1.5 text-slate-400 hover:text-slate-600" title="Abbrechen"><X size={16} /></button>
        </div>
    );
}

function AddSubnetModal({ onClose, onAdd, isPending }: { onClose: () => void; onAdd: (subnet: Omit<CreateSubnetRequest, 'tenantId'>) => void; isPending: boolean }) {
    const [cidr, setCidr] = useState('');
    const [vlan, setVlan] = useState<string>('');
    const [vlanName, setVlanName] = useState('');
    const [description, setDescription] = useState('');
    const [gateway, setGateway] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!cidr.trim()) return;
        // NOTE: vlan handling assumes we just pass ID for now or backend handles creation?
        // Backend currently expects vlanId (UUID) but frontend mockup had number.
        // For MVP, if we don't have real VLAN objects yet, we might pass vlanId as null and rely on description/vlanName in free text?
        // Actually CreateSubnetRequest expects vlanId: UUID.
        // If we don't have VLANs created, we can't link them yet.
        // Let's pass vlanId as undefined for now effectively, until we implement VLAN management.
        // Or we assume the user enters a valid UUID? No, user enters "10".
        // TODO: We need a backend migration to support simple vlan_id (int) on the subnet directly if we don't want full VLAN entities yet.
        // But `Subnet` entity has `vlan` relation.
        // For now, I will omit `vlanId` in the request to backend to avoid UUID parse error, and users data "VLAN 10" will sadly be lost unless I add a text field for it or fix backend to support auto-creating VLANs or storing vlan_tag directly.
        // User request "Create Subnet" should work. I added gateway to backend. I did NOT add raw vlan_tag to backend Subnet entity.
        // I will temporarily store vlan info in description or ignore it to prevent crash.
        // BETTER: Put "VLAN 10 - Name" into description if provided.

        onAdd({
            cidr,
            description,
            gateway: gateway.trim() || undefined,
            vlanTag: vlan ? parseInt(vlan) : undefined,
            vlanName: vlanName.trim() || undefined
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Neues Subnet</h2>
                    <button onClick={onClose} className="btn-icon"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">CIDR *</label>
                        <input value={cidr} onChange={e => setCidr(e.target.value)} className="input font-mono" placeholder="z.B. 10.0.30.0/24" required autoFocus disabled={isPending} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">VLAN ID</label>
                            <input type="number" value={vlan} onChange={e => setVlan(e.target.value)} className="input" min={1} max={4094} disabled={isPending} placeholder="z.B. 10" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">VLAN Name</label>
                            <input value={vlanName} onChange={e => setVlanName(e.target.value)} className="input" placeholder="z.B. DMZ" disabled={isPending} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Gateway</label>
                        <input value={gateway} onChange={e => setGateway(e.target.value)} className="input font-mono" placeholder="z.B. 10.0.30.1" disabled={isPending} />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Beschreibung</label>
                        <input value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="z.B. DMZ für Webserver" disabled={isPending} />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={isPending} className="btn-secondary text-xs">Abbrechen</button>
                        <button type="submit" disabled={isPending} className="btn-primary text-xs flex items-center gap-2">
                            {isPending && <Loader2 size={12} className="animate-spin" />}
                            Subnet erstellen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
