import { useState } from 'react';
import { cn } from '../../lib/utils';

// Mock Switch Data
const SWITCH_INFO = {
    name: 'Core-Switch-01',
    model: 'HP Aruba 2930F-48G',
    ip: '10.0.0.1',
    location: 'Rack A-01, U40',
    totalPorts: 48,
};

interface PortData {
    number: number;
    status: 'up' | 'down' | 'disabled';
    vlan: number;
    vlanName: string;
    device?: string;
    speed?: string;
}

const VLAN_COLORS: Record<number, string> = {
    1: 'ring-gray-400',
    10: 'ring-blue-400',
    20: 'ring-green-400',
    30: 'ring-sky-400',
    99: 'ring-red-400',
};

const VLAN_LABELS: Record<number, string> = {
    1: 'Management',
    10: 'VoIP',
    20: 'Clients',
    30: 'Server',
    99: 'Disabled',
};

// Generate 48 ports with mock data
const PORTS: PortData[] = Array.from({ length: 48 }, (_, i) => {
    const n = i + 1;
    if (n <= 2) return { number: n, status: 'up' as const, vlan: 1, vlanName: 'Management', device: n === 1 ? 'Firewall Port 1' : 'AP-Controller', speed: '1Gbps' };
    if (n >= 3 && n <= 8) return { number: n, status: 'up' as const, vlan: 10, vlanName: 'VoIP', device: `Telefon ${n - 2}`, speed: '100Mbps' };
    if (n >= 9 && n <= 20) return { number: n, status: 'up' as const, vlan: 20, vlanName: 'Clients', device: `WS-${n - 8}`, speed: '1Gbps' };
    if (n >= 21 && n <= 24) return { number: n, status: 'up' as const, vlan: 30, vlanName: 'Server', device: n === 21 ? 'ESXi-01' : n === 22 ? 'ESXi-02' : n === 23 ? 'NAS' : 'Backup', speed: '1Gbps' };
    if (n === 47 || n === 48) return { number: n, status: 'disabled' as const, vlan: 99, vlanName: 'Disabled' };
    return { number: n, status: 'down' as const, vlan: 20, vlanName: 'Clients' };
});

export default function SwitchFaceplate() {
    const [hoveredPort, setHoveredPort] = useState<PortData | null>(null);

    // Split into two rows (odd on top, even on bottom - like real switches)
    const topRow = PORTS.filter((_, i) => i % 2 === 0);
    const bottomRow = PORTS.filter((_, i) => i % 2 === 1);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Switch Info Header */}
            <div className="card p-5 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">{SWITCH_INFO.name}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{SWITCH_INFO.model}</p>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-500">
                        <div>
                            <span className="text-slate-400">IP: </span>
                            <span className="font-mono font-semibold text-slate-800">{SWITCH_INFO.ip}</span>
                        </div>
                        <div>
                            <span className="text-slate-400">Standort: </span>
                            <span className="text-slate-700">{SWITCH_INFO.location}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* VLAN Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">VLANs:</span>
                {Object.entries(VLAN_LABELS).map(([vlan, name]) => (
                    <span key={vlan} className="flex items-center gap-1.5">
                        <div className={cn('w-3 h-3 rounded border-2', VLAN_COLORS[parseInt(vlan)] || 'ring-gray-300', 'bg-white')} style={{ borderColor: VLAN_COLORS[parseInt(vlan)]?.replace('ring-', '').replace('-400', '') }} />
                        <span>VLAN {vlan} – {name}</span>
                    </span>
                ))}
            </div>

            {/* The Faceplate */}
            <div className="card p-6 bg-slate-800 rounded-xl overflow-hidden">
                {/* Top Row */}
                <div className="flex gap-1 mb-1 justify-center flex-wrap">
                    {topRow.map(port => (
                        <PortSlot
                            key={port.number}
                            port={port}
                            onHover={setHoveredPort}
                        />
                    ))}
                </div>
                {/* Bottom Row */}
                <div className="flex gap-1 justify-center flex-wrap">
                    {bottomRow.map(port => (
                        <PortSlot
                            key={port.number}
                            port={port}
                            onHover={setHoveredPort}
                        />
                    ))}
                </div>
            </div>

            {/* Hover Info */}
            <div className="mt-4 h-12 card px-5 flex items-center text-xs text-slate-500 gap-6">
                {hoveredPort ? (
                    <>
                        <span className="font-bold text-slate-800">Port {hoveredPort.number}</span>
                        <span className={cn('badge',
                            hoveredPort.status === 'up' && 'badge-ok',
                            hoveredPort.status === 'down' && 'badge-planned',
                            hoveredPort.status === 'disabled' && 'badge-error',
                        )}>
                            {hoveredPort.status === 'up' ? 'Link Up' : hoveredPort.status === 'down' ? 'Link Down' : 'Disabled'}
                        </span>
                        <span>VLAN {hoveredPort.vlan} ({hoveredPort.vlanName})</span>
                        {hoveredPort.device && <span>→ <strong>{hoveredPort.device}</strong></span>}
                        {hoveredPort.speed && <span className="text-slate-400">{hoveredPort.speed}</span>}
                    </>
                ) : (
                    <span>Hover über einen Port für Details · Klick für Quick Actions</span>
                )}
            </div>
        </div>
    );
}

function PortSlot({ port, onHover }: { port: PortData; onHover: (p: PortData | null) => void }) {
    const vlanRingColor = VLAN_COLORS[port.vlan] || 'ring-gray-300';

    return (
        <button
            onMouseEnter={() => onHover(port)}
            onMouseLeave={() => onHover(null)}
            className={cn(
                'w-9 h-8 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold transition-all ring-2 ring-inset',
                vlanRingColor,
                port.status === 'up' && 'bg-green-400 text-green-900 shadow-[0_0_6px_rgba(34,197,94,0.4)]',
                port.status === 'down' && 'bg-slate-500 text-slate-200',
                port.status === 'disabled' && 'bg-red-800 text-red-300',
                'hover:scale-125 hover:z-10 hover:shadow-lg cursor-pointer',
            )}
            title={`Port ${port.number}: ${port.status} | VLAN ${port.vlan} ${port.device ? `| ${port.device}` : ''}`}
        >
            {port.number}
        </button>
    );
}
