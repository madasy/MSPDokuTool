import { useState } from 'react';
import { type Rack, type Device } from '../services/RackService';
import RackVisualization from '../components/rack/RackVisualization';
import { Cpu, Monitor, X, Wifi, Shield, Box } from 'lucide-react';
import { cn } from '../lib/utils';

// Mock Data
const MOCK_RACK: Rack = {
    id: '1',
    name: 'Rack A-01',
    heightUnits: 42,
    devices: [
        { id: 'd1', name: 'Core-Switch-01', deviceType: 'SWITCH', status: 'ACTIVE', positionU: 40, heightU: 1 },
        { id: 'd2', name: 'Firewall-Main', deviceType: 'FIREWALL', status: 'ACTIVE', positionU: 38, heightU: 1 },
        { id: 'd3', name: 'Patchpanel A', deviceType: 'PATCHPANEL', status: 'ACTIVE', positionU: 41, heightU: 1 },
        { id: 'd4', name: 'ESXi-Host-01', deviceType: 'SERVER', status: 'ACTIVE', positionU: 10, heightU: 2 },
        { id: 'd5', name: 'ESXi-Host-02', deviceType: 'SERVER', status: 'ACTIVE', positionU: 8, heightU: 2 },
        { id: 'd6', name: 'NAS Storage', deviceType: 'OTHER', status: 'ACTIVE', positionU: 4, heightU: 4 },
    ],
};

const UNPLACED_DEVICES: Device[] = [
    { id: 'u1', name: 'Switch-Ersatz', deviceType: 'SWITCH', status: 'PLANNED', heightU: 1 },
    { id: 'u2', name: 'WiFi-AP-03', deviceType: 'WIFI_AP', status: 'PLANNED', heightU: 1 },
    { id: 'u3', name: 'Backup-NAS', deviceType: 'OTHER', status: 'PLANNED', heightU: 2 },
];

const DEVICE_DETAILS: Record<string, { ip: string; serial: string; firmware: string; power: string; uplink: string }> = {
    'd1': { ip: '10.0.0.1', serial: 'SW-2024-0001', firmware: 'v16.2.3', power: '150W', uplink: 'Firewall-Main Port 1' },
    'd2': { ip: '10.0.0.254', serial: 'FW-2023-0042', firmware: 'v7.4.1', power: '85W', uplink: 'ISP Glasfaser' },
    'd4': { ip: '10.0.1.10', serial: 'SRV-2024-0012', firmware: 'ESXi 8.0u2', power: '450W', uplink: 'Core-Switch Port 5' },
    'd5': { ip: '10.0.1.11', serial: 'SRV-2024-0013', firmware: 'ESXi 8.0u2', power: '450W', uplink: 'Core-Switch Port 6' },
    'd6': { ip: '10.0.1.20', serial: 'NAS-2023-0005', firmware: 'DSM 7.2', power: '120W', uplink: 'Core-Switch Port 10' },
};

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
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

    return (
        <div className="flex h-full">
            {/* Left Panel: Unplaced Devices ("Storage Room") */}
            <div className="w-60 border-r border-white/60 bg-white/80 backdrop-blur flex-shrink-0 flex flex-col">
                <div className="p-4 border-b border-white/70">
                    <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <Box size={14} className="text-slate-400" />
                        Lager / Unplatziert
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{UNPLACED_DEVICES.length} Geräte</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {UNPLACED_DEVICES.map(device => (
                        <button
                            key={device.id}
                            onClick={() => setSelectedDevice(device)}
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
                </div>
            </div>

            {/* Center: Rack Visualization */}
            <div className="flex-1 flex items-start justify-center overflow-auto p-6 bg-white/60">
                <RackVisualization
                    rack={MOCK_RACK}
                    onDeviceClick={(device) => setSelectedDevice(device)}
                />
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
                            <button
                                onClick={() => setSelectedDevice(null)}
                                className="btn-icon"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Basic Info */}
                            <DetailSection title="Grunddaten">
                                <DetailRow label="Typ" value={selectedDevice.deviceType} />
                                <DetailRow label="Status" value={selectedDevice.status} badge />
                                <DetailRow label="Höhe" value={`${selectedDevice.heightU} HE`} />
                                {selectedDevice.positionU && (
                                    <DetailRow label="Position" value={`U${selectedDevice.positionU}`} />
                                )}
                            </DetailSection>

                            {/* Technical Details (Progressive Disclosure) */}
                            {DEVICE_DETAILS[selectedDevice.id] && (
                                <DetailSection title="Technische Details">
                                    <DetailRow label="IP" value={DEVICE_DETAILS[selectedDevice.id].ip} copyable />
                                    <DetailRow label="Seriennr." value={DEVICE_DETAILS[selectedDevice.id].serial} copyable />
                                    <DetailRow label="Firmware" value={DEVICE_DETAILS[selectedDevice.id].firmware} />
                                    <DetailRow label="Leistung" value={DEVICE_DETAILS[selectedDevice.id].power} />
                                    <DetailRow label="Uplink" value={DEVICE_DETAILS[selectedDevice.id].uplink} />
                                </DetailSection>
                            )}
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
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
    };

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
                    <button
                        onClick={handleCopy}
                        className="copy-btn"
                        title="Kopieren"
                    >
                        📋
                    </button>
                )}
            </div>
        </div>
    );
}
