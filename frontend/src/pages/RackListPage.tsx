import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RackService, type RackDevice } from '../services/RackService';
import { SiteService, RoomService } from '../services/SiteService';
import { DeviceService } from '../services/DeviceService';
import RackVisualization from '../components/rack/RackVisualization';
import { useToast } from '../components/ui/Toast';
import { Cpu, Monitor, X, Wifi, Shield, Box, Loader2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

function getDeviceIcon(type: string) {
    switch (type) {
        case 'SERVER': return <Cpu size={14} />;
        case 'SWITCH': return <Monitor size={14} />;
        case 'FIREWALL': return <Shield size={14} />;
        case 'WIFI_AP': return <Wifi size={14} />;
        default: return <Box size={14} />;
    }
}

function CreateRackModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [name, setName] = useState('');
    const [heightUnits, setHeightUnits] = useState(42);
    const [selectedSiteId, setSelectedSiteId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');

    const { data: sites, isLoading: sitesLoading } = useQuery({
        queryKey: ['sites', tenantId],
        queryFn: () => SiteService.getByTenant(tenantId),
        enabled: !!tenantId,
    });

    const { data: rooms, isLoading: roomsLoading } = useQuery({
        queryKey: ['rooms', selectedSiteId],
        queryFn: () => RoomService.getBySite(selectedSiteId),
        enabled: !!selectedSiteId,
    });

    const createMutation = useMutation({
        mutationFn: () => RackService.createInRoom(selectedRoomId, { name, heightUnits }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['racks', tenantId] });
            addToast({ type: 'success', title: 'Rack erstellt', message: `"${name}" wurde erfolgreich angelegt.` });
            onClose();
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler', message: 'Rack konnte nicht erstellt werden.' });
        },
    });

    const handleSiteChange = (siteId: string) => {
        setSelectedSiteId(siteId);
        setSelectedRoomId('');
    };

    const canSubmit = name.trim() && selectedRoomId && !createMutation.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Neues Rack erstellen</h2>
                    <button onClick={onClose} className="btn-icon">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="z.B. Rack-01"
                            className="input w-full"
                            autoFocus
                        />
                    </div>

                    {/* Height Units */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Höheneinheiten (HE)
                        </label>
                        <input
                            type="number"
                            value={heightUnits}
                            onChange={e => setHeightUnits(Number(e.target.value))}
                            min={1}
                            max={100}
                            className="input w-full"
                        />
                    </div>

                    {/* Site Selector */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Standort <span className="text-red-500">*</span>
                        </label>
                        {sitesLoading ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                                <Loader2 size={14} className="animate-spin" /> Standorte werden geladen...
                            </div>
                        ) : (
                            <select
                                value={selectedSiteId}
                                onChange={e => handleSiteChange(e.target.value)}
                                className="input w-full"
                            >
                                <option value="">Standort wählen…</option>
                                {sites?.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        )}
                        {sites?.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">Noch keine Standorte vorhanden. Bitte zuerst einen Standort anlegen.</p>
                        )}
                    </div>

                    {/* Room Selector */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Raum <span className="text-red-500">*</span>
                        </label>
                        {selectedSiteId && roomsLoading ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                                <Loader2 size={14} className="animate-spin" /> Räume werden geladen...
                            </div>
                        ) : (
                            <select
                                value={selectedRoomId}
                                onChange={e => setSelectedRoomId(e.target.value)}
                                disabled={!selectedSiteId}
                                className="input w-full disabled:opacity-50"
                            >
                                <option value="">Raum wählen…</option>
                                {rooms?.map(room => (
                                    <option key={room.id} value={room.id}>{room.name}</option>
                                ))}
                            </select>
                        )}
                        {selectedSiteId && rooms?.length === 0 && !roomsLoading && (
                            <p className="text-xs text-amber-600 mt-1">Keine Räume für diesen Standort. Bitte zuerst einen Raum anlegen.</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="btn btn-ghost">Abbrechen</button>
                    <button
                        onClick={() => createMutation.mutate()}
                        disabled={!canSubmit}
                        className="btn btn-primary"
                    >
                        {createMutation.isPending ? (
                            <><Loader2 size={14} className="animate-spin" /> Erstellen…</>
                        ) : (
                            <>Rack erstellen</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RackListPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [selectedDevice, setSelectedDevice] = useState<RackDevice | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [placementU, setPlacementU] = useState<string>('');
    const [selectedRackId, setSelectedRackId] = useState<string | null>(null);

    // Track whether the selected device is unplaced (from left panel)
    const [selectedIsUnplaced, setSelectedIsUnplaced] = useState(false);

    const placeMutation = useMutation({
        mutationFn: async ({ deviceId, rackId, positionU }: { deviceId: string; rackId: string; positionU: number }) => {
            const device = await DeviceService.getById(deviceId);
            return DeviceService.update(deviceId, {
                name: device.name,
                deviceType: device.deviceType,
                model: device.model,
                serial: device.serial,
                ip: device.ip,
                mac: device.mac,
                status: device.status,
                heightU: device.heightU,
                siteId: device.siteId,
                rj45Ports: device.rj45Ports,
                sfpPorts: device.sfpPorts,
                rackId,
                positionU,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['devices'] });
            queryClient.invalidateQueries({ queryKey: ['racks', tenantId] });
            setSelectedDevice(null);
            setPlacementU('');
            setSelectedIsUnplaced(false);
            addToast({ type: 'success', title: 'Platziert', message: 'Gerät wurde im Rack platziert.' });
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler', message: 'Gerät konnte nicht platziert werden.' });
        },
    });

    const { data: racks, isLoading: racksLoading } = useQuery({
        queryKey: ['racks', tenantId],
        queryFn: () => RackService.getByTenant(tenantId!),
        enabled: !!tenantId,
    });

    const { data: unplacedDevices } = useQuery({
        queryKey: ['devices', 'unplaced', tenantId],
        queryFn: async () => {
            const all = await DeviceService.getAll(tenantId);
            return all.filter(d => !d.rackId);
        },
        enabled: !!tenantId,
    });

    const activeRackId = selectedRackId ?? racks?.[0]?.id ?? null;
    const activeRack = racks?.find(r => r.id === activeRackId) ?? null;

    if (racksLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    if (!racks || racks.length === 0) {
        return (
            <>
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <Box size={48} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-slate-600">Keine Racks vorhanden</p>
                        <p className="text-sm text-slate-400 mt-1 mb-5">Erstelle zunächst einen Standort, Raum und Rack.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn btn-primary"
                        >
                            <Plus size={14} />
                            Rack erstellen
                        </button>
                    </div>
                </div>
                {showCreateModal && tenantId && (
                    <CreateRackModal tenantId={tenantId} onClose={() => setShowCreateModal(false)} />
                )}
            </>
        );
    }

    return (
        <>
            <div className="flex h-full">
                {/* Left Panel: Unplaced Devices */}
                <div className="w-60 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <Box size={14} className="text-slate-400" />
                            Lager / Unplatziert
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">{unplacedDevices?.length ?? 0} Geräte</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                        {unplacedDevices?.map(device => (
                            <button
                                key={device.id}
                                onClick={() => {
                                    setSelectedDevice({
                                        id: device.id,
                                        name: device.name,
                                        deviceType: device.deviceType as RackDevice['deviceType'],
                                        status: device.status,
                                        heightU: device.heightU,
                                        serialNumber: device.serial,
                                        ip: device.ip,
                                        model: device.model,
                                    });
                                    setSelectedIsUnplaced(true);
                                    setPlacementU('');
                                }}
                                className={cn(
                                    'w-full text-left px-3 py-2.5 rounded-xl border transition-colors text-xs',
                                    selectedDevice?.id === device.id
                                        ? 'bg-primary-50 border-primary-200 text-primary-700'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-white'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {getDeviceIcon(device.deviceType)}
                                    <span className="font-medium truncate">{device.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span>{device.heightU}U</span>
                                    <span className="badge badge-planned text-[10px] py-0">{device.status}</span>
                                </div>
                            </button>
                        ))}
                        {(!unplacedDevices || unplacedDevices.length === 0) && (
                            <p className="text-xs text-slate-400 px-3 py-4 text-center">Keine unplatzierten Geräte</p>
                        )}
                    </div>
                </div>

                {/* Center: Rack Visualization */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
                    {/* Rack area header with selector and "Neues Rack" button */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <div className="flex items-center gap-3">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {racks.length} {racks.length === 1 ? 'Rack' : 'Racks'}
                            </p>
                            {racks.length > 1 && (
                                <select
                                    value={activeRackId ?? ''}
                                    onChange={e => setSelectedRackId(e.target.value)}
                                    className="input text-sm py-1 pr-8"
                                >
                                    {racks.map(rack => (
                                        <option key={rack.id} value={rack.id}>{rack.name}</option>
                                    ))}
                                </select>
                            )}
                            {racks.length === 1 && activeRack && (
                                <span className="text-sm text-slate-500 dark:text-slate-400">{activeRack.name}</span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn btn-primary btn-sm"
                        >
                            <Plus size={14} />
                            Neues Rack
                        </button>
                    </div>
                    <div className="flex-1 flex items-start justify-center overflow-auto p-6">
                        {activeRack && (
                            <RackVisualization
                                rack={{
                                    id: activeRack.id,
                                    name: activeRack.name,
                                    heightUnits: activeRack.heightUnits,
                                    devices: activeRack.devices.map(d => ({
                                        id: d.id,
                                        name: d.name,
                                        deviceType: d.deviceType,
                                        status: d.status,
                                        positionU: d.positionU,
                                        heightU: d.heightU,
                                    })),
                                }}
                                onDeviceClick={(device) => {
                                    const full = activeRack.devices.find(d => d.id === device.id);
                                    if (full) {
                                        setSelectedDevice(full);
                                        setSelectedIsUnplaced(false);
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Right Panel: Device Detail */}
                <div className={cn(
                    'w-72 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col transition-all',
                    selectedDevice ? 'translate-x-0' : 'translate-x-full hidden'
                )}>
                    {selectedDevice && (
                        <>
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-800 truncate">{selectedDevice.name}</h3>
                                <button onClick={() => setSelectedDevice(null)} className="btn-icon">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <DetailSection title="Grunddaten">
                                    <DetailRow label="Typ" value={selectedDevice.deviceType} />
                                    <DetailRow label="Status" value={selectedDevice.status} badge />
                                    <DetailRow label="Höhe" value={`${selectedDevice.heightU} HE`} />
                                    {selectedDevice.positionU && (
                                        <DetailRow label="Position" value={`U${selectedDevice.positionU}`} />
                                    )}
                                </DetailSection>
                                <DetailSection title="Technische Details">
                                    {selectedDevice.ip && <DetailRow label="IP" value={selectedDevice.ip} copyable />}
                                    {selectedDevice.serialNumber && <DetailRow label="Seriennr." value={selectedDevice.serialNumber} copyable />}
                                    {selectedDevice.model && <DetailRow label="Modell" value={selectedDevice.model} />}
                                </DetailSection>

                                {/* Placement UI for unplaced devices */}
                                {selectedIsUnplaced && activeRack && (
                                    <DetailSection title="Im Rack platzieren">
                                        <p className="text-[11px] text-slate-500 mb-2">
                                            In "{activeRack.name}" platzieren:
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-slate-500 whitespace-nowrap">Position U:</label>
                                            <input
                                                type="number"
                                                value={placementU}
                                                onChange={e => setPlacementU(e.target.value)}
                                                className="input text-xs py-1 w-16"
                                                min={1}
                                                max={activeRack.heightUnits}
                                                placeholder="U"
                                            />
                                            <button
                                                onClick={() => {
                                                    const u = parseInt(placementU);
                                                    if (u && selectedDevice) {
                                                        placeMutation.mutate({
                                                            deviceId: selectedDevice.id,
                                                            rackId: activeRack.id,
                                                            positionU: u,
                                                        });
                                                    }
                                                }}
                                                disabled={!placementU || placeMutation.isPending}
                                                className="btn-primary text-[11px] px-2 py-1 disabled:opacity-50"
                                            >
                                                {placeMutation.isPending ? (
                                                    <Loader2 size={12} className="animate-spin" />
                                                ) : (
                                                    'Platzieren'
                                                )}
                                            </button>
                                        </div>
                                    </DetailSection>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {showCreateModal && tenantId && (
                <CreateRackModal tenantId={tenantId} onClose={() => setShowCreateModal(false)} />
            )}
        </>
    );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h4>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function DetailRow({ label, value, copyable, badge }: {
    label: string; value: string; copyable?: boolean; badge?: boolean;
}) {
    const handleCopy = () => { navigator.clipboard.writeText(value); };

    return (
        <div className="flex items-center justify-between group text-xs">
            <span className="text-slate-500">{label}</span>
            <div className="flex items-center gap-1.5">
                {badge ? (
                    <span className={cn('badge text-[10px]',
                        value === 'ACTIVE' && 'badge-ok',
                        value === 'PLANNED' && 'badge-planned',
                        value === 'STORAGE' && 'badge-warning',
                    )}>{value}</span>
                ) : (
                    <span className={cn('text-slate-800 font-medium', copyable && 'font-mono')}>{value}</span>
                )}
                {copyable && (
                    <button onClick={handleCopy} className="copy-btn" title="Kopieren">📋</button>
                )}
            </div>
        </div>
    );
}
