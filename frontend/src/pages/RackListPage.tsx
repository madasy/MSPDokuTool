import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RackService, type Rack, type RackDevice } from '../services/RackService';
import { DeviceService } from '../services/DeviceService';
import RackVisualization from '../components/rack/RackVisualization';
import { Cpu, Monitor, X, Wifi, Shield, Box, Loader2 } from 'lucide-react';
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

export default function RackListPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [selectedDevice, setSelectedDevice] = useState<RackDevice | null>(null);

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

    const firstRack = racks?.[0];

    if (racksLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    if (!racks || racks.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Box size={48} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-slate-600">Keine Racks vorhanden</p>
                    <p className="text-sm text-slate-400 mt-1">Erstelle zunächst einen Standort, Raum und Rack.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            {/* Left Panel: Unplaced Devices */}
            <div className="w-60 border-r border-white/60 bg-white/80 backdrop-blur flex-shrink-0 flex flex-col">
                <div className="p-4 border-b border-white/70">
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
                            onClick={() => setSelectedDevice({
                                id: device.id,
                                name: device.name,
                                deviceType: device.deviceType as RackDevice['deviceType'],
                                status: device.status,
                                heightU: device.heightU,
                                serialNumber: device.serial,
                                ip: device.ip,
                                model: device.model,
                            })}
                            className={cn(
                                'w-full text-left px-3 py-2.5 rounded-xl border transition-colors text-xs',
                                selectedDevice?.id === device.id
                                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                                    : 'bg-white/80 border-white/60 text-slate-600 hover:bg-white'
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
            <div className="flex-1 flex items-start justify-center overflow-auto p-6 bg-white/60">
                {firstRack && (
                    <RackVisualization
                        rack={{
                            id: firstRack.id,
                            name: firstRack.name,
                            heightUnits: firstRack.heightUnits,
                            devices: firstRack.devices.map(d => ({
                                id: d.id,
                                name: d.name,
                                deviceType: d.deviceType,
                                status: d.status,
                                positionU: d.positionU,
                                heightU: d.heightU,
                            })),
                        }}
                        onDeviceClick={(device) => {
                            const full = firstRack.devices.find(d => d.id === device.id);
                            if (full) setSelectedDevice(full);
                        }}
                    />
                )}
            </div>

            {/* Right Panel: Device Detail */}
            <div className={cn(
                'w-72 border-l border-white/60 bg-white/85 backdrop-blur flex-shrink-0 flex flex-col transition-all',
                selectedDevice ? 'translate-x-0' : 'translate-x-full hidden'
            )}>
                {selectedDevice && (
                    <>
                        <div className="p-4 border-b border-white/70 flex items-center justify-between">
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
                        </div>
                    </>
                )}
            </div>
        </div>
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
