import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cpu, Monitor, Shield, Wifi, Box, Plus, Search, Edit2, Trash2, X, Check, Server, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { DeviceService, type Device, type CreateDeviceRequest } from '../services/DeviceService';
import { SiteService } from '../services/SiteService';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    SERVER: <Cpu size={14} />,
    SWITCH: <Monitor size={14} />,
    FIREWALL: <Shield size={14} />,
    WIFI_AP: <Wifi size={14} />,
    PATCHPANEL: <Server size={14} />,
    OTHER: <Box size={14} />,
};

const TYPE_LABELS: Record<string, string> = {
    SERVER: 'Server',
    SWITCH: 'Switch',
    FIREWALL: 'Firewall',
    WIFI_AP: 'WiFi AP',
    PATCHPANEL: 'Patchpanel',
    PDU: 'PDU',
    ROUTER: 'Router',
    OTHER: 'Sonstiges',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Aktiv',
    PLANNED: 'Geplant',
    STORAGE: 'Lager',
    RETIRED: 'Ausgemustert',
};

export default function HardwarePage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const { addToast } = useToast();

    const { data: devices = [], isLoading } = useQuery({
        queryKey: ['devices', tenantId],
        queryFn: () => DeviceService.getAll(tenantId),
        enabled: !!tenantId,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => DeviceService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices', tenantId] });
            addToast({ type: 'info', title: 'Gelöscht', message: 'Gerät wurde entfernt.' });
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler', message: 'Gerät konnte nicht gelöscht werden.' });
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<CreateDeviceRequest> }) =>
            DeviceService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices', tenantId] });
            setEditingId(null);
            addToast({ type: 'success', title: 'Gespeichert', message: 'Gerät wurde aktualisiert.' });
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler', message: 'Gerät konnte nicht aktualisiert werden.' });
        },
    });

    const filtered = devices.filter(d => {
        const matchesSearch = !searchQuery ||
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.ip ?? '').includes(searchQuery) ||
            (d.mac ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.serial ?? '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !filterType || d.deviceType === filterType;
        return matchesSearch && matchesType;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Hardware</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{devices.length} Geräte · {devices.filter(d => d.status === 'ACTIVE').length} aktiv</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Name, IP, MAC, Serial..."
                            className="pl-8 pr-3 w-56 input-sm"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="input-sm w-36"
                    >
                        <option value="">Alle Typen</option>
                        {Object.entries(TYPE_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs px-3 py-1.5">
                        <Plus size={14} />
                        Gerät hinzufügen
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                            <th className="table-header-cell w-12"></th>
                            <th className="table-header-cell">Name</th>
                            <th className="table-header-cell w-24">Typ</th>
                            <th className="table-header-cell">Modell</th>
                            <th className="table-header-cell w-32">Seriennr.</th>
                            <th className="table-header-cell w-32">IP</th>
                            <th className="table-header-cell w-36">MAC</th>
                            <th className="table-header-cell w-24">Status</th>
                            <th className="table-header-cell w-28">Rack</th>
                            <th className="table-header-cell w-20">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {filtered.map(device => (
                            editingId === device.id ? (
                                <EditableRow
                                    key={device.id}
                                    device={device}
                                    onSave={(id, updated) => updateMutation.mutate({ id, data: updated })}
                                    onCancel={() => setEditingId(null)}
                                />
                            ) : (
                                <DeviceRow
                                    key={device.id}
                                    device={device}
                                    onEdit={() => setEditingId(device.id)}
                                    onDelete={() => deleteMutation.mutate(device.id)}
                                />
                            )
                        ))}
                    </tbody>
                </table>
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-sm text-slate-400">
                        Keine Geräte gefunden
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && tenantId && (
                <AddDeviceModal
                    tenantId={tenantId}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['devices', tenantId] });
                        setShowAddModal(false);
                    }}
                />
            )}
        </div>
    );
}

function DeviceRow({ device, onEdit, onDelete }: { device: Device; onEdit: () => void; onDelete: () => void }) {
    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
            <td className="table-cell">
                <span className="text-slate-400">{TYPE_ICONS[device.deviceType] || <Box size={14} />}</span>
            </td>
            <td className="table-cell font-medium text-slate-800 dark:text-white">{device.name}</td>
            <td className="table-cell text-xs text-slate-500 dark:text-slate-400">{TYPE_LABELS[device.deviceType] || device.deviceType}</td>
            <td className="table-cell text-xs text-slate-600 dark:text-slate-300">{device.model || '–'}</td>
            <td className="table-cell font-mono text-xs text-slate-500">{device.serial || '–'}</td>
            <td className="table-cell font-mono text-xs text-slate-700 dark:text-slate-300">{device.ip || '–'}</td>
            <td className="table-cell font-mono text-xs text-slate-500">{device.mac || '–'}</td>
            <td className="table-cell">
                <span className={cn('badge text-[10px]',
                    device.status === 'ACTIVE' && 'badge-ok',
                    device.status === 'PLANNED' && 'badge-planned',
                    device.status === 'STORAGE' && 'badge-warning',
                    device.status === 'RETIRED' && 'badge-error',
                )}>{STATUS_LABELS[device.status]}</span>
            </td>
            <td className="table-cell text-xs text-slate-500">{device.rackName || '–'}</td>
            <td className="table-cell">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onEdit} className="p-1 text-slate-400 hover:text-primary-500" title="Bearbeiten">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-500" title="Löschen">
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function EditableRow({ device, onSave, onCancel }: { device: Device; onSave: (id: string, updated: Partial<CreateDeviceRequest>) => void; onCancel: () => void }) {
    const [name, setName] = useState(device.name);
    const [model, setModel] = useState(device.model ?? '');
    const [serial, setSerial] = useState(device.serial ?? '');
    const [ip, setIp] = useState(device.ip ?? '');
    const [mac, setMac] = useState(device.mac ?? '');
    const [status, setStatus] = useState(device.status);

    return (
        <tr className="bg-primary-50/50 dark:bg-primary-900/20">
            <td className="table-cell"><span className="text-slate-400">{TYPE_ICONS[device.deviceType]}</span></td>
            <td className="table-cell"><input value={name} onChange={e => setName(e.target.value)} className="input text-xs py-1" /></td>
            <td className="table-cell text-xs">{TYPE_LABELS[device.deviceType]}</td>
            <td className="table-cell"><input value={model} onChange={e => setModel(e.target.value)} className="input text-xs py-1" /></td>
            <td className="table-cell"><input value={serial} onChange={e => setSerial(e.target.value)} className="input text-xs py-1 font-mono" /></td>
            <td className="table-cell"><input value={ip} onChange={e => setIp(e.target.value)} className="input text-xs py-1 font-mono" /></td>
            <td className="table-cell"><input value={mac} onChange={e => setMac(e.target.value)} className="input text-xs py-1 font-mono" /></td>
            <td className="table-cell">
                <select value={status} onChange={e => setStatus(e.target.value as Device['status'])} className="input text-xs py-1">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>
            </td>
            <td className="table-cell text-xs">{device.rackName || '–'}</td>
            <td className="table-cell">
                <div className="flex items-center gap-1">
                    <button onClick={() => onSave(device.id, { name, model, serial, ip, mac, status, deviceType: device.deviceType, heightU: device.heightU, rackId: device.rackId, siteId: device.siteId, rj45Ports: device.rj45Ports, sfpPorts: device.sfpPorts })} className="p-1 text-green-600 hover:text-green-700" title="Speichern">
                        <Check size={14} />
                    </button>
                    <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600" title="Abbrechen">
                        <X size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

function AddDeviceModal({ tenantId, onClose, onSuccess }: { tenantId: string; onClose: () => void; onSuccess: () => void }) {
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [deviceType, setDeviceType] = useState('SERVER');
    const [model, setModel] = useState('');
    const [serial, setSerial] = useState('');
    const [ip, setIp] = useState('');
    const [mac, setMac] = useState('');
    const [status, setStatus] = useState<Device['status']>('ACTIVE');
    const [heightU, setHeightU] = useState(1);
    const [rj45Ports, setRj45Ports] = useState(0);
    const [sfpPorts, setSfpPorts] = useState(0);
    const [siteId, setSiteId] = useState('');

    const { data: sites, isLoading: sitesLoading } = useQuery({
        queryKey: ['sites', tenantId],
        queryFn: () => SiteService.getByTenant(tenantId),
        enabled: !!tenantId,
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateDeviceRequest) => DeviceService.create(data),
        onSuccess: (created) => {
            addToast({ type: 'success', title: 'Gerät hinzugefügt', message: `${created.name} wurde erstellt.` });
            onSuccess();
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler', message: 'Gerät konnte nicht erstellt werden.' });
        },
    });

    const showPortFields = deviceType === 'SWITCH' || deviceType === 'FIREWALL';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !siteId) return;
        createMutation.mutate({
            name,
            deviceType,
            model: model || undefined,
            serial: serial || undefined,
            ip: ip || undefined,
            mac: mac || undefined,
            status,
            heightU,
            siteId,
            rj45Ports: showPortFields ? rj45Ports : 0,
            sfpPorts: showPortFields ? sfpPorts : 0,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Neues Gerät hinzufügen</h2>
                    <button onClick={onClose} className="btn-icon"><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Name *</label>
                            <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="z.B. Core-Switch-02" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Gerätetyp</label>
                            <select value={deviceType} onChange={e => setDeviceType(e.target.value)} className="input">
                                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Site selector */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Standort *</label>
                        {sitesLoading ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                                <Loader2 size={14} className="animate-spin" /> Standorte werden geladen...
                            </div>
                        ) : (
                            <select value={siteId} onChange={e => setSiteId(e.target.value)} className="input" required>
                                <option value="">Standort wählen...</option>
                                {sites?.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        )}
                        {sites?.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">Noch keine Standorte vorhanden. Bitte zuerst einen Standort anlegen.</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Modell</label>
                            <input value={model} onChange={e => setModel(e.target.value)} className="input" placeholder="z.B. HP Aruba 2930F" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Seriennummer</label>
                            <input value={serial} onChange={e => setSerial(e.target.value)} className="input font-mono" placeholder="z.B. SW-2024-0001" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">IP-Adresse</label>
                            <input value={ip} onChange={e => setIp(e.target.value)} className="input font-mono" placeholder="z.B. 10.0.0.1" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">MAC-Adresse</label>
                            <input value={mac} onChange={e => setMac(e.target.value)} className="input font-mono" placeholder="z.B. AA:BB:CC:11:22:33" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value as Device['status'])} className="input">
                                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Höheneinheiten (HE)</label>
                            <input type="number" value={heightU} onChange={e => setHeightU(parseInt(e.target.value) || 1)} className="input" min={1} max={48} />
                        </div>
                    </div>
                    {showPortFields && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                            <div className="col-span-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                Port-Konfiguration
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">RJ45 Ports</label>
                                <input type="number" value={rj45Ports} onChange={e => setRj45Ports(parseInt(e.target.value) || 0)} className="input" min={0} max={96} placeholder="z.B. 48" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">SFP Ports</label>
                                <input type="number" value={sfpPorts} onChange={e => setSfpPorts(parseInt(e.target.value) || 0)} className="input" min={0} max={32} placeholder="z.B. 4" />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs">Abbrechen</button>
                        <button type="submit" disabled={createMutation.isPending || !siteId} className="btn-primary text-xs">
                            {createMutation.isPending ? (
                                <><Loader2 size={14} className="animate-spin" /> Erstellen...</>
                            ) : (
                                'Gerät erstellen'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
