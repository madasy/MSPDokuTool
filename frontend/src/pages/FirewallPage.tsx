import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeviceService, type Device } from '../services/DeviceService';
import { FirewallService, type FirewallInterface, type CreateFirewallInterfaceRequest, type UpdateFirewallInterfaceRequest } from '../services/FirewallService';
import { cn } from '../lib/utils';
import { Shield, ChevronRight, Loader2, Plus, Save, X, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';

const INTERFACE_TYPES = ['wan', 'lan', 'dmz', 'ha', 'mgmt'] as const;

const TYPE_COLORS: Record<string, string> = {
    wan:  'bg-red-500/20 text-red-400 border-red-500/30',
    lan:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
    dmz:  'bg-orange-500/20 text-orange-400 border-orange-500/30',
    ha:   'bg-purple-500/20 text-purple-400 border-purple-500/30',
    mgmt: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const STATUS_COLORS: Record<string, string> = {
    enabled:  'bg-green-500/20 text-green-400',
    disabled: 'bg-red-500/20 text-red-400',
};

function getTypeBadge(type: string) {
    return TYPE_COLORS[type] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

const DEFAULT_INTERFACES = ['WAN1', 'WAN2', 'LAN1', 'LAN2', 'LAN3', 'LAN4', 'DMZ', 'MGMT'];

export default function FirewallPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const [selectedFirewall, setSelectedFirewall] = useState<Device | null>(null);
    const [selectedInterface, setSelectedInterface] = useState<FirewallInterface | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Edit form state
    const [editType, setEditType] = useState('lan');
    const [editZone, setEditZone] = useState('');
    const [editIp, setEditIp] = useState('');
    const [editSubnet, setEditSubnet] = useState('');
    const [editVlan, setEditVlan] = useState('');
    const [editDhcp, setEditDhcp] = useState(false);
    const [editStatus, setEditStatus] = useState('enabled');
    const [editDesc, setEditDesc] = useState('');

    const { data: devices, isLoading: devicesLoading } = useQuery({
        queryKey: ['devices', tenantId],
        queryFn: () => DeviceService.getAll(tenantId),
        enabled: !!tenantId,
    });

    const firewalls = devices?.filter(d => d.deviceType === 'FIREWALL') ?? [];
    const activeFirewall = selectedFirewall ?? firewalls[0] ?? null;

    const { data: interfaces, isLoading: interfacesLoading } = useQuery({
        queryKey: ['fw-interfaces', activeFirewall?.id],
        queryFn: () => FirewallService.getInterfaces(activeFirewall!.id),
        enabled: !!activeFirewall,
    });

    const createMutation = useMutation({
        mutationFn: (req: CreateFirewallInterfaceRequest) =>
            FirewallService.createInterface(activeFirewall!.id, req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fw-interfaces', activeFirewall?.id] });
            setShowAddModal(false);
            addToast({ type: 'success', title: 'Interface erstellt' });
        },
        onError: () => addToast({ type: 'error', title: 'Fehler beim Erstellen' }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ name, data }: { name: string; data: UpdateFirewallInterfaceRequest }) =>
            FirewallService.updateInterface(activeFirewall!.id, name, data),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['fw-interfaces', activeFirewall?.id] });
            setSelectedInterface(updated);
            addToast({ type: 'success', title: `${updated.interfaceName} gespeichert` });
        },
        onError: () => addToast({ type: 'error', title: 'Fehler beim Speichern' }),
    });

    const deleteMutation = useMutation({
        mutationFn: (name: string) => FirewallService.deleteInterface(activeFirewall!.id, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fw-interfaces', activeFirewall?.id] });
            setSelectedInterface(null);
            addToast({ type: 'info', title: 'Interface gelöscht' });
        },
        onError: () => addToast({ type: 'error', title: 'Fehler beim Löschen' }),
    });

    function handleSelectInterface(iface: FirewallInterface) {
        setSelectedInterface(iface);
        setEditType(iface.interfaceType);
        setEditZone(iface.zone ?? '');
        setEditIp(iface.ipAddress ?? '');
        setEditSubnet(iface.subnetMask ?? '');
        setEditVlan(iface.vlanId?.toString() ?? '');
        setEditDhcp(iface.dhcpEnabled);
        setEditStatus(iface.status);
        setEditDesc(iface.description ?? '');
    }

    function handleSave() {
        if (!selectedInterface) return;
        updateMutation.mutate({
            name: selectedInterface.interfaceName,
            data: {
                interfaceType: editType,
                zone: editZone || undefined,
                ipAddress: editIp || undefined,
                subnetMask: editSubnet || undefined,
                vlanId: editVlan ? parseInt(editVlan) : undefined,
                dhcpEnabled: editDhcp,
                status: editStatus,
                description: editDesc || undefined,
            },
        });
    }

    if (devicesLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Left panel: firewall list */}
            <div className="w-72 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Shield size={16} className="text-primary-500" />
                        Firewalls
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">{firewalls.length} Gerät{firewalls.length !== 1 ? 'e' : ''}</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {firewalls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                            <Shield size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
                            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Keine Firewalls vorhanden</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 max-w-[200px]">
                                Erstelle zuerst eine Firewall unter Hardware (Typ: FIREWALL), dann dokumentiere hier die Interfaces.
                            </p>
                            <div className="space-y-2 text-xs text-left mb-4">
                                <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                                    <span className="w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                                    <span>Hardware → Gerät hinzufügen</span>
                                </div>
                                <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                                    <span className="w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                                    <span>Typ: <strong>FIREWALL</strong> wählen</span>
                                </div>
                                <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400">
                                    <span className="w-4 h-4 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                                    <span>Hierher zurückkommen</span>
                                </div>
                            </div>
                            <Link to="../hardware" relative="path" className="btn-primary text-xs inline-flex items-center gap-1">
                                Zu Hardware <ArrowRight size={12} />
                            </Link>
                        </div>
                    ) : (
                        firewalls.map(fw => (
                            <button
                                key={fw.id}
                                onClick={() => { setSelectedFirewall(fw); setSelectedInterface(null); }}
                                className={cn(
                                    'w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 transition-colors',
                                    activeFirewall?.id === fw.id
                                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-l-primary-400'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{fw.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{fw.model ?? 'Kein Modell'}</p>
                                    {fw.ip && <p className="text-xs font-mono text-slate-500">{fw.ip}</p>}
                                </div>
                                <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
                {activeFirewall ? (
                    <>
                        {/* Firewall header */}
                        <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{activeFirewall.name}</h2>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-0.5">
                                    {activeFirewall.model && <span>{activeFirewall.model}</span>}
                                    {activeFirewall.ip && <span className="font-mono">{activeFirewall.ip}</span>}
                                    <span className={cn(
                                        'px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide text-white text-[10px]',
                                        activeFirewall.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'
                                    )}>{activeFirewall.status}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-primary text-xs flex items-center gap-1.5"
                            >
                                <Plus size={14} />
                                Interface hinzufügen
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 space-y-4">
                            {interfacesLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 size={24} className="animate-spin text-slate-400" />
                                </div>
                            ) : !interfaces || interfaces.length === 0 ? (
                                <div className="card p-8 text-center">
                                    <Shield size={32} className="text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 mb-4">Keine Interfaces konfiguriert</p>
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="btn-primary text-xs flex items-center gap-1.5 mx-auto"
                                    >
                                        <Plus size={12} />
                                        Erstes Interface anlegen
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {interfaces.map(iface => (
                                        <InterfaceCard
                                            key={iface.id}
                                            iface={iface}
                                            isSelected={selectedInterface?.id === iface.id}
                                            onClick={() => handleSelectInterface(iface)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Edit panel */}
                            {selectedInterface && (
                                <div className="card p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                            <Shield size={16} className="text-primary-400" />
                                            {selectedInterface.interfaceName} — Konfiguration
                                        </h3>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Interface "${selectedInterface.interfaceName}" wirklich löschen?`)) {
                                                    deleteMutation.mutate(selectedInterface.interfaceName);
                                                }
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Löschen"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Typ</label>
                                            <select className="input text-sm" value={editType} onChange={e => setEditType(e.target.value)}>
                                                {INTERFACE_TYPES.map(t => (
                                                    <option key={t} value={t}>{t.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Status</label>
                                            <select className="input text-sm" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                                                <option value="enabled">Enabled</option>
                                                <option value="disabled">Disabled</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Zone</label>
                                            <input type="text" className="input text-sm" placeholder="z.B. OUTSIDE" value={editZone} onChange={e => setEditZone(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">VLAN ID</label>
                                            <input type="number" className="input text-sm" placeholder="z.B. 10" value={editVlan} onChange={e => setEditVlan(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">IP-Adresse</label>
                                            <input type="text" className="input text-sm font-mono" placeholder="z.B. 192.168.1.1" value={editIp} onChange={e => setEditIp(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Subnetzmaske</label>
                                            <input type="text" className="input text-sm font-mono" placeholder="z.B. 255.255.255.0" value={editSubnet} onChange={e => setEditSubnet(e.target.value)} />
                                        </div>
                                        <div className="flex items-center gap-2 pt-4">
                                            <input type="checkbox" id="dhcp-edit" checked={editDhcp} onChange={e => setEditDhcp(e.target.checked)} className="rounded" />
                                            <label htmlFor="dhcp-edit" className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">DHCP aktiviert</label>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Beschreibung</label>
                                            <input type="text" className="input text-sm" placeholder="Optionale Beschreibung" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={handleSave}
                                            disabled={updateMutation.isPending}
                                            className="btn-primary text-xs flex items-center gap-1.5"
                                        >
                                            {updateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                            Speichern
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                        Wähle eine Firewall aus
                    </div>
                )}
            </div>

            {/* Add Interface Modal */}
            {showAddModal && activeFirewall && (
                <AddInterfaceModal
                    onClose={() => setShowAddModal(false)}
                    onCreate={(req) => createMutation.mutate(req)}
                    isPending={createMutation.isPending}
                />
            )}
        </div>
    );
}

function InterfaceCard({ iface, isSelected, onClick }: {
    iface: FirewallInterface;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full text-left p-4 rounded-xl border transition-all',
                isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            )}
        >
            <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{iface.interfaceName}</span>
                        <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border', getTypeBadge(iface.interfaceType))}>
                            {iface.interfaceType}
                        </span>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', STATUS_COLORS[iface.status] ?? 'bg-slate-200 text-slate-500')}>
                            {iface.status}
                        </span>
                        {iface.dhcpEnabled && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400">DHCP</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        {iface.ipAddress && (
                            <span className="font-mono">{iface.ipAddress}{iface.subnetMask ? ` / ${iface.subnetMask}` : ''}</span>
                        )}
                        {iface.zone && <span>Zone: {iface.zone}</span>}
                        {iface.vlanId && <span>VLAN {iface.vlanId}</span>}
                        {iface.description && <span className="truncate text-slate-400 italic">{iface.description}</span>}
                    </div>
                </div>
                <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
            </div>
        </button>
    );
}

function AddInterfaceModal({ onClose, onCreate, isPending }: {
    onClose: () => void;
    onCreate: (req: CreateFirewallInterfaceRequest) => void;
    isPending: boolean;
}) {
    const [name, setName] = useState('');
    const [type, setType] = useState('lan');
    const [zone, setZone] = useState('');
    const [ip, setIp] = useState('');
    const [subnet, setSubnet] = useState('');
    const [vlan, setVlan] = useState('');
    const [dhcp, setDhcp] = useState(false);
    const [desc, setDesc] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate({
            interfaceName: name.toUpperCase(),
            interfaceType: type,
            zone: zone || undefined,
            ipAddress: ip || undefined,
            subnetMask: subnet || undefined,
            vlanId: vlan ? parseInt(vlan) : undefined,
            dhcpEnabled: dhcp,
            description: desc || undefined,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Interface hinzufügen</h2>
                    <button onClick={onClose} className="btn-icon"><X size={18} /></button>
                </div>

                {/* Quick add buttons */}
                <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Schnellauswahl</p>
                    <div className="flex flex-wrap gap-1.5">
                        {DEFAULT_INTERFACES.map(n => (
                            <button
                                key={n}
                                type="button"
                                onClick={() => {
                                    setName(n);
                                    if (n.startsWith('WAN')) setType('wan');
                                    else if (n.startsWith('DMZ')) setType('dmz');
                                    else if (n === 'MGMT') setType('mgmt');
                                    else setType('lan');
                                }}
                                className={cn(
                                    'text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors',
                                    name === n
                                        ? 'bg-primary-500 text-white border-primary-500'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600'
                                )}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Name *</label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value.toUpperCase())}
                                className="input font-mono"
                                placeholder="z.B. WAN1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Typ</label>
                            <select value={type} onChange={e => setType(e.target.value)} className="input">
                                {INTERFACE_TYPES.map(t => (
                                    <option key={t} value={t}>{t.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">IP-Adresse</label>
                            <input value={ip} onChange={e => setIp(e.target.value)} className="input font-mono" placeholder="z.B. 192.168.1.1" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Subnetzmaske</label>
                            <input value={subnet} onChange={e => setSubnet(e.target.value)} className="input font-mono" placeholder="z.B. 255.255.255.0" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Zone</label>
                            <input value={zone} onChange={e => setZone(e.target.value)} className="input" placeholder="z.B. OUTSIDE" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">VLAN ID</label>
                            <input type="number" value={vlan} onChange={e => setVlan(e.target.value)} className="input" placeholder="z.B. 10" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Beschreibung</label>
                        <input value={desc} onChange={e => setDesc(e.target.value)} className="input" placeholder="Optionale Beschreibung" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="dhcp-new" checked={dhcp} onChange={e => setDhcp(e.target.checked)} className="rounded" />
                        <label htmlFor="dhcp-new" className="text-xs font-semibold text-slate-600 dark:text-slate-300">DHCP aktiviert</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs">Abbrechen</button>
                        <button type="submit" disabled={isPending} className="btn-primary text-xs flex items-center gap-1.5">
                            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                            Interface erstellen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
