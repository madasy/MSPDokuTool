import { useState } from 'react';
import { cn } from '../lib/utils';
import { Monitor, ChevronDown } from 'lucide-react';

// Types
interface PortData {
    number: number;
    status: 'up' | 'down' | 'disabled';
    vlan: number;
    vlanName: string;
    device?: string;
    speed?: string;
}

interface SwitchDevice {
    id: string;
    name: string;
    model: string;
    ip: string;
    location: string;
    totalPorts: number;
    ports: PortData[];
}

const VLAN_OPTIONS = [
    { id: 1, name: 'Management', color: 'bg-gray-400' },
    { id: 10, name: 'VoIP', color: 'bg-blue-400' },
    { id: 20, name: 'Clients', color: 'bg-green-400' },
    { id: 30, name: 'Server', color: 'bg-sky-400' },
    { id: 99, name: 'Disabled', color: 'bg-red-400' },
];

const VLAN_COLORS: Record<number, string> = {
    1: 'ring-gray-400',
    10: 'ring-blue-400',
    20: 'ring-green-400',
    30: 'ring-sky-400',
    99: 'ring-red-400',
};

// Generate ports
function generatePorts(count: number): PortData[] {
    return Array.from({ length: count }, (_, i) => {
        const n = i + 1;
        if (n <= 2) return { number: n, status: 'up' as const, vlan: 1, vlanName: 'Management', device: n === 1 ? 'Firewall Port 1' : 'AP-Controller', speed: '1Gbps' };
        if (n >= 3 && n <= 8) return { number: n, status: 'up' as const, vlan: 10, vlanName: 'VoIP', device: `Telefon ${n - 2}`, speed: '100Mbps' };
        if (n >= 9 && n <= 20) return { number: n, status: 'up' as const, vlan: 20, vlanName: 'Clients', device: `WS-${n - 8}`, speed: '1Gbps' };
        if (n >= 21 && n <= 24) return { number: n, status: 'up' as const, vlan: 30, vlanName: 'Server', device: n === 21 ? 'ESXi-01' : n === 22 ? 'ESXi-02' : n === 23 ? 'NAS' : 'Backup', speed: '1Gbps' };
        if (n === 47 || n === 48) return { number: n, status: 'disabled' as const, vlan: 99, vlanName: 'Disabled' };
        return { number: n, status: 'down' as const, vlan: 20, vlanName: 'Clients' };
    });
}

const MOCK_SWITCHES: SwitchDevice[] = [
    { id: 'sw1', name: 'Core-Switch-01', model: 'HP Aruba 2930F-48G', ip: '10.0.0.1', location: 'Rack A-01, U40', totalPorts: 48, ports: generatePorts(48) },
    { id: 'sw2', name: 'Access-Switch-01', model: 'HP Aruba 2530-24G', ip: '10.0.0.2', location: 'Rack A-01, U39', totalPorts: 24, ports: generatePorts(24) },
];

export default function SwitchesPage() {
    const [selectedSwitch, setSelectedSwitch] = useState<string>(MOCK_SWITCHES[0].id);
    const [switches, setSwitches] = useState(MOCK_SWITCHES);
    const [hoveredPort, setHoveredPort] = useState<PortData | null>(null);
    const [editingPort, setEditingPort] = useState<number | null>(null);

    const currentSwitch = switches.find(s => s.id === selectedSwitch) || switches[0];
    const topRow = currentSwitch.ports.filter((_, i) => i % 2 === 0);
    const bottomRow = currentSwitch.ports.filter((_, i) => i % 2 === 1);

    const handleVlanChange = (portNumber: number, newVlan: number) => {
        const vlanInfo = VLAN_OPTIONS.find(v => v.id === newVlan);
        setSwitches(prev => prev.map(sw => {
            if (sw.id !== selectedSwitch) return sw;
            return {
                ...sw,
                ports: sw.ports.map(p =>
                    p.number === portNumber
                        ? { ...p, vlan: newVlan, vlanName: vlanInfo?.name || `VLAN ${newVlan}`, status: newVlan === 99 ? 'disabled' as const : p.status }
                        : p
                ),
            };
        }));
        setEditingPort(null);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 bg-white/75 dark:bg-slate-800/75 backdrop-blur border-b border-white/60 dark:border-white/10 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Switches</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{switches.length} Switches · Klicke auf einen Port zum Bearbeiten</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedSwitch}
                        onChange={e => { setSelectedSwitch(e.target.value); setEditingPort(null); }}
                        className="input-sm w-56"
                    >
                        {switches.map(sw => (
                            <option key={sw.id} value={sw.id}>{sw.name} ({sw.ip})</option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500">
                        Neue Switches über <span className="font-semibold text-slate-700 dark:text-slate-300">Hardware → Gerät hinzufügen</span> anlegen
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto">
                    {/* Switch Info */}
                    <div className="card p-5 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Monitor size={20} className="text-slate-400" />
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{currentSwitch.name}</h2>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">{currentSwitch.model}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
                                <div><span className="text-slate-500">IP: </span><span className="font-mono font-semibold text-slate-800 dark:text-white">{currentSwitch.ip}</span></div>
                                <div><span className="text-slate-500">Standort: </span><span className="text-slate-700 dark:text-slate-300">{currentSwitch.location}</span></div>
                                <div><span className="text-slate-500">Ports: </span><span className="text-slate-700 dark:text-slate-300">{currentSwitch.totalPorts}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* VLAN Legend */}
                    <div className="flex items-center gap-4 mb-4 text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">VLANs:</span>
                        {VLAN_OPTIONS.map(vlan => (
                            <span key={vlan.id} className="flex items-center gap-1.5">
                                <div className={cn('w-3 h-3 rounded', vlan.color)} />
                                <span>VLAN {vlan.id} – {vlan.name}</span>
                            </span>
                        ))}
                    </div>

                    {/* Faceplate */}
                    <div className="card p-6 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden">
                        <div className="flex gap-1 mb-1 justify-center flex-wrap">
                            {topRow.map(port => (
                                <PortSlot key={port.number} port={port} onHover={setHoveredPort} onEdit={() => setEditingPort(port.number)} isEditing={editingPort === port.number} />
                            ))}
                        </div>
                        <div className="flex gap-1 justify-center flex-wrap">
                            {bottomRow.map(port => (
                                <PortSlot key={port.number} port={port} onHover={setHoveredPort} onEdit={() => setEditingPort(port.number)} isEditing={editingPort === port.number} />
                            ))}
                        </div>
                    </div>

                    {/* Port Editor / Info */}
                    <div className="mt-4 card px-5 py-3 min-h-[48px] flex items-center text-xs text-slate-500 dark:text-slate-400 gap-4">
                        {editingPort !== null ? (
                            <PortEditor
                                port={currentSwitch.ports.find(p => p.number === editingPort)!}
                                onVlanChange={handleVlanChange}
                                onClose={() => setEditingPort(null)}
                            />
                        ) : hoveredPort ? (
                            <>
                                <span className="font-bold text-slate-800 dark:text-white">Port {hoveredPort.number}</span>
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
                            <span>Hover über einen Port für Details · Klick zum Bearbeiten der VLAN-Zuordnung</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function PortSlot({ port, onHover, onEdit, isEditing }: { port: PortData; onHover: (p: PortData | null) => void; onEdit: () => void; isEditing: boolean }) {
    const vlanRingColor = VLAN_COLORS[port.vlan] || 'ring-gray-300';

    return (
        <button
            onMouseEnter={() => onHover(port)}
            onMouseLeave={() => onHover(null)}
            onClick={onEdit}
            className={cn(
                'w-9 h-8 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold transition-all ring-2 ring-inset',
                vlanRingColor,
                port.status === 'up' && 'bg-green-400 text-green-900 shadow-[0_0_6px_rgba(34,197,94,0.4)]',
                port.status === 'down' && 'bg-slate-500 text-slate-200',
                port.status === 'disabled' && 'bg-red-800 text-red-300',
                isEditing && 'scale-125 z-10 shadow-lg ring-4 ring-yellow-400',
                !isEditing && 'hover:scale-125 hover:z-10 hover:shadow-lg cursor-pointer',
            )}
            title={`Port ${port.number}: ${port.status} | VLAN ${port.vlan} ${port.device ? `| ${port.device}` : ''}`}
        >
            {port.number}
        </button>
    );
}

function PortEditor({ port, onVlanChange, onClose }: { port: PortData; onVlanChange: (portNumber: number, vlan: number) => void; onClose: () => void }) {
    const [showDropdown, setShowDropdown] = useState(false);

    return (
        <div className="flex items-center gap-4 w-full">
            <span className="font-bold text-slate-800 dark:text-white">Port {port.number} bearbeiten</span>
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs"
                >
                    <div className={cn('w-2.5 h-2.5 rounded', VLAN_OPTIONS.find(v => v.id === port.vlan)?.color || 'bg-gray-400')} />
                    VLAN {port.vlan} – {port.vlanName}
                    <ChevronDown size={12} />
                </button>
                {showDropdown && (
                    <div className="absolute top-full mt-1 left-0 z-20 bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 py-1 w-48">
                        {VLAN_OPTIONS.map(vlan => (
                            <button
                                key={vlan.id}
                                onClick={() => { onVlanChange(port.number, vlan.id); setShowDropdown(false); }}
                                className={cn(
                                    'w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors',
                                    port.vlan === vlan.id && 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                )}
                            >
                                <div className={cn('w-2.5 h-2.5 rounded', vlan.color)} />
                                VLAN {vlan.id} – {vlan.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {port.device && <span className="text-slate-500">→ {port.device}</span>}
            {port.speed && <span className="text-slate-400">{port.speed}</span>}
            <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-medium">Schließen</button>
        </div>
    );
}
