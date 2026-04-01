import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DeviceService, type Device } from '../services/DeviceService';
import { SwitchPortService, type SwitchPort, type UpdateSwitchPortRequest } from '../services/SwitchPortService';
import { cn } from '../lib/utils';
import { Monitor, ChevronRight, Loader2, Plus, Save } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

// VLAN color mapping
const VLAN_COLORS: Record<number, string> = {
    1:  'bg-slate-400',
    10: 'bg-blue-500',
    20: 'bg-green-500',
    30: 'bg-sky-500',
    40: 'bg-purple-500',
    99: 'bg-red-500',
};

const VLAN_LABELS: Record<number, string> = {
    1:  'Default',
    10: 'VLAN 10',
    20: 'VLAN 20',
    30: 'VLAN 30',
    40: 'VLAN 40',
    99: 'Management',
};

function getVlanColor(vlanId: number | null): string {
    if (!vlanId) return 'bg-slate-200 dark:bg-slate-600';
    return VLAN_COLORS[vlanId] ?? 'bg-orange-400';
}

function getStatusColor(status: string): string {
    switch (status) {
        case 'up':       return 'ring-green-500';
        case 'down':     return 'ring-slate-400';
        case 'disabled': return 'ring-red-600';
        default:         return 'ring-slate-400';
    }
}

function getStatusDot(status: string): string {
    switch (status) {
        case 'up':       return 'bg-green-500';
        case 'down':     return 'bg-slate-400';
        case 'disabled': return 'bg-red-600';
        default:         return 'bg-slate-400';
    }
}

export default function SwitchesPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const [selectedSwitch, setSelectedSwitch] = useState<Device | null>(null);
    const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);

    // Edit form state
    const [editMode, setEditMode] = useState<string>('access');
    const [editVlan, setEditVlan] = useState<string>('');
    const [editTaggedVlans, setEditTaggedVlans] = useState<string>('');
    const [editSpeed, setEditSpeed] = useState<string>('');
    const [editConnected, setEditConnected] = useState<string>('');
    const [editStatus, setEditStatus] = useState<string>('down');

    const { data: devices, isLoading: devicesLoading } = useQuery({
        queryKey: ['devices', tenantId],
        queryFn: () => DeviceService.getAll(tenantId),
        enabled: !!tenantId,
    });

    const switches = devices?.filter(d => d.deviceType === 'SWITCH') ?? [];
    const activeSwitchId = selectedSwitch?.id ?? switches[0]?.id;
    const activeSwitch = selectedSwitch ?? switches[0] ?? null;

    const { data: ports, isLoading: portsLoading } = useQuery({
        queryKey: ['switch-ports', activeSwitchId],
        queryFn: () => SwitchPortService.getPorts(activeSwitchId!),
        enabled: !!activeSwitchId,
    });

    const initMutation = useMutation({
        mutationFn: (portCount: number) => SwitchPortService.initializePorts(activeSwitchId!, portCount),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['switch-ports', activeSwitchId] });
            addToast({ type: 'success', title: 'Ports initialisiert' });
        },
        onError: () => addToast({ type: 'error', title: 'Fehler beim Initialisieren' }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ portNumber, data }: { portNumber: number; data: UpdateSwitchPortRequest }) =>
            SwitchPortService.updatePort(activeSwitchId!, portNumber, data),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['switch-ports', activeSwitchId] });
            setSelectedPort(updated);
            addToast({ type: 'success', title: `Port ${updated.portNumber} gespeichert` });
        },
        onError: () => addToast({ type: 'error', title: 'Fehler beim Speichern' }),
    });

    function handlePortClick(port: SwitchPort) {
        setSelectedPort(port);
        setEditMode(port.mode);
        setEditStatus(port.status);
        setEditVlan(port.accessVlanId?.toString() ?? '');
        setEditTaggedVlans(port.taggedVlans.join(','));
        setEditSpeed(port.speed ?? '');
        setEditConnected(port.connectedDevice ?? '');
    }

    function handleSave() {
        if (!selectedPort) return;
        const taggedList = editTaggedVlans
            .split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n));

        updateMutation.mutate({
            portNumber: selectedPort.portNumber,
            data: {
                status: editStatus,
                mode: editMode,
                accessVlanId: editVlan ? parseInt(editVlan) : undefined,
                taggedVlans: taggedList,
                speed: editSpeed || undefined,
                connectedDevice: editConnected || undefined,
            },
        });
    }

    const rj45Count = activeSwitch?.rj45Ports ?? 0;
    const sfpCount = activeSwitch?.sfpPorts ?? 0;
    const totalPorts = ports?.length ?? 0;

    // Separate RJ45 ports (1..rj45Count) from SFP ports (rj45Count+1..total)
    // If device has no port count config, treat all as RJ45
    const rj45Ports = rj45Count > 0
        ? (ports?.filter(p => p.portNumber <= rj45Count) ?? [])
        : (ports ?? []);
    const sfpPorts  = rj45Count > 0 && sfpCount > 0
        ? (ports?.filter(p => p.portNumber > rj45Count) ?? [])
        : [];

    // Split ports into odd (top row) and even (bottom row)
    const oddPorts  = rj45Ports.filter(p => p.portNumber % 2 !== 0);
    const evenPorts = rj45Ports.filter(p => p.portNumber % 2 === 0);

    // Unique VLANs in use
    const vlanIds = [...new Set(ports?.map(p => p.accessVlanId).filter(Boolean) as number[])];

    if (devicesLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Left panel: switch list */}
            <div className="w-72 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 flex flex-col">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Monitor size={16} className="text-primary-500" />
                        Switches
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">{switches.length} Gerät{switches.length !== 1 ? 'e' : ''}</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {switches.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400">
                            Keine Switches vorhanden
                        </div>
                    ) : (
                        switches.map(sw => (
                            <button
                                key={sw.id}
                                onClick={() => { setSelectedSwitch(sw); setSelectedPort(null); }}
                                className={cn(
                                    'w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 transition-colors',
                                    activeSwitch?.id === sw.id
                                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-2 border-l-primary-400'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                )}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{sw.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{sw.model ?? 'Kein Modell'}</p>
                                    {sw.ip && <p className="text-xs font-mono text-slate-500">{sw.ip}</p>}
                                </div>
                                <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-900">
                {activeSwitch ? (
                    <>
                        {/* Switch header */}
                        <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{activeSwitch.name}</h2>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-0.5">
                                    {activeSwitch.model && <span>{activeSwitch.model}</span>}
                                    {activeSwitch.ip && <span className="font-mono">{activeSwitch.ip}</span>}
                                    <span className={cn(
                                        'px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide text-white text-[10px]',
                                        activeSwitch.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-400'
                                    )}>{activeSwitch.status}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6 space-y-6">
                            {portsLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 size={24} className="animate-spin text-slate-400" />
                                </div>
                            ) : !ports || ports.length === 0 ? (
                                <div className="card p-8 text-center">
                                    <Monitor size={32} className="text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 mb-4">Keine Ports konfiguriert</p>
                                    <div className="flex items-center justify-center gap-3 flex-wrap">
                                        {activeSwitch && (activeSwitch.rj45Ports ?? 0) + (activeSwitch.sfpPorts ?? 0) > 0 ? (
                                            <button
                                                onClick={() => initMutation.mutate((activeSwitch.rj45Ports ?? 0) + (activeSwitch.sfpPorts ?? 0))}
                                                disabled={initMutation.isPending}
                                                className="btn-primary text-xs flex items-center gap-1"
                                            >
                                                {initMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                                {(activeSwitch.rj45Ports ?? 0) + (activeSwitch.sfpPorts ?? 0)} Ports initialisieren
                                                {(activeSwitch.rj45Ports ?? 0) > 0 && (activeSwitch.sfpPorts ?? 0) > 0 && (
                                                    <span className="text-primary-200 ml-1">({activeSwitch.rj45Ports} RJ45 + {activeSwitch.sfpPorts} SFP)</span>
                                                )}
                                            </button>
                                        ) : (
                                            [24, 48].map(count => (
                                                <button
                                                    key={count}
                                                    onClick={() => initMutation.mutate(count)}
                                                    disabled={initMutation.isPending}
                                                    className="btn-primary text-xs flex items-center gap-1"
                                                >
                                                    {initMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                                    {count} Ports initialisieren
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* VLAN legend */}
                                    {vlanIds.length > 0 && (
                                        <div className="card p-4">
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">VLAN Legende</p>
                                            <div className="flex flex-wrap gap-3">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                    <span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-600 inline-block" />
                                                    Kein VLAN
                                                </div>
                                                {vlanIds.map(id => (
                                                    <div key={id} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                        <span className={cn('w-3 h-3 rounded-sm inline-block', getVlanColor(id))} />
                                                        {VLAN_LABELS[id] ?? `VLAN ${id}`}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Port faceplate */}
                                    <div className="card p-4">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
                                            Port-Übersicht ({totalPorts} Ports{sfpPorts.length > 0 ? ` · ${rj45Ports.length} RJ45 + ${sfpPorts.length} SFP` : ''})
                                        </p>
                                        <div className="bg-slate-800 rounded-xl p-4 space-y-3 overflow-x-auto">
                                            {/* RJ45 section */}
                                            {rj45Ports.length > 0 && (
                                                <div>
                                                    {sfpPorts.length > 0 && (
                                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">RJ45</p>
                                                    )}
                                                    <div className="space-y-1.5">
                                                        {/* Odd ports — top row */}
                                                        <div className="flex gap-1">
                                                            {oddPorts.map(port => (
                                                                <PortSquare
                                                                    key={port.id}
                                                                    port={port}
                                                                    isSelected={selectedPort?.id === port.id}
                                                                    onClick={() => handlePortClick(port)}
                                                                />
                                                            ))}
                                                        </div>
                                                        {/* Even ports — bottom row */}
                                                        <div className="flex gap-1">
                                                            {evenPorts.map(port => (
                                                                <PortSquare
                                                                    key={port.id}
                                                                    port={port}
                                                                    isSelected={selectedPort?.id === port.id}
                                                                    onClick={() => handlePortClick(port)}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {/* SFP section */}
                                            {sfpPorts.length > 0 && (
                                                <div className="border-t border-slate-600 pt-3">
                                                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5">SFP</p>
                                                    <div className="flex gap-1 flex-wrap">
                                                        {sfpPorts.map(port => (
                                                            <PortSquare
                                                                key={port.id}
                                                                port={port}
                                                                isSelected={selectedPort?.id === port.id}
                                                                onClick={() => handlePortClick(port)}
                                                                isSfp
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Port edit panel */}
                                    {selectedPort && (
                                        <div className="card p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('w-2.5 h-2.5 rounded-full', getStatusDot(selectedPort.status))} />
                                                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                                                        {selectedPort.portName ?? `Port ${selectedPort.portNumber}`}
                                                    </h3>
                                                    <span className="text-xs text-slate-400">#{selectedPort.portNumber}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                {/* Status */}
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Status</label>
                                                    <select
                                                        className="input text-sm"
                                                        value={editStatus}
                                                        onChange={e => setEditStatus(e.target.value)}
                                                    >
                                                        <option value="up">Up</option>
                                                        <option value="down">Down</option>
                                                        <option value="disabled">Disabled</option>
                                                    </select>
                                                </div>

                                                {/* Mode */}
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Modus</label>
                                                    <select
                                                        className="input text-sm"
                                                        value={editMode}
                                                        onChange={e => setEditMode(e.target.value)}
                                                    >
                                                        <option value="access">Access</option>
                                                        <option value="trunk">Trunk</option>
                                                    </select>
                                                </div>

                                                {/* Access VLAN */}
                                                {editMode === 'access' && (
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Access VLAN</label>
                                                        <input
                                                            type="number"
                                                            className="input text-sm"
                                                            placeholder="z.B. 10"
                                                            value={editVlan}
                                                            onChange={e => setEditVlan(e.target.value)}
                                                        />
                                                    </div>
                                                )}

                                                {/* Tagged VLANs */}
                                                {editMode === 'trunk' && (
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Tagged VLANs</label>
                                                        <input
                                                            type="text"
                                                            className="input text-sm"
                                                            placeholder="10,20,30"
                                                            value={editTaggedVlans}
                                                            onChange={e => setEditTaggedVlans(e.target.value)}
                                                        />
                                                    </div>
                                                )}

                                                {/* Speed */}
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Speed</label>
                                                    <select
                                                        className="input text-sm"
                                                        value={editSpeed}
                                                        onChange={e => setEditSpeed(e.target.value)}
                                                    >
                                                        <option value="">Automatisch</option>
                                                        <option value="10M">10 Mbps</option>
                                                        <option value="100M">100 Mbps</option>
                                                        <option value="1G">1 Gbps</option>
                                                        <option value="10G">10 Gbps</option>
                                                        <option value="25G">25 Gbps</option>
                                                        <option value="100G">100 Gbps</option>
                                                    </select>
                                                </div>

                                                {/* Connected device */}
                                                <div className="col-span-2">
                                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block uppercase tracking-wide">Verbundenes Gerät</label>
                                                    <input
                                                        type="text"
                                                        className="input text-sm"
                                                        placeholder="z.B. srv-web-01"
                                                        value={editConnected}
                                                        onChange={e => setEditConnected(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end mt-4">
                                                <button
                                                    onClick={handleSave}
                                                    disabled={updateMutation.isPending}
                                                    className="btn-primary text-xs flex items-center gap-1.5"
                                                >
                                                    {updateMutation.isPending
                                                        ? <Loader2 size={12} className="animate-spin" />
                                                        : <Save size={12} />}
                                                    Speichern
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                        Wähle einen Switch aus
                    </div>
                )}
            </div>
        </div>
    );
}

function PortSquare({ port, isSelected, onClick, isSfp = false }: {
    port: SwitchPort;
    isSelected: boolean;
    onClick: () => void;
    isSfp?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            title={`${isSfp ? 'SFP ' : ''}Port ${port.portNumber}${port.portName ? ` — ${port.portName}` : ''}${port.connectedDevice ? ` → ${port.connectedDevice}` : ''}\nStatus: ${port.status}\nVLAN: ${port.accessVlanId ?? '-'}`}
            className={cn(
                'flex-shrink-0 flex flex-col items-center justify-center font-bold text-white transition-all ring-2',
                isSfp ? 'w-9 h-9 rounded text-[8px] gap-0.5' : 'w-7 h-7 rounded-sm text-[9px]',
                getVlanColor(port.accessVlanId),
                getStatusColor(port.status),
                isSelected ? 'ring-offset-2 ring-offset-slate-800 scale-110' : 'ring-offset-1 ring-offset-slate-800 hover:scale-105'
            )}
        >
            {isSfp && <span className="text-[7px] font-semibold opacity-80 leading-none">SFP</span>}
            <span>{port.portNumber}</span>
        </button>
    );
}
