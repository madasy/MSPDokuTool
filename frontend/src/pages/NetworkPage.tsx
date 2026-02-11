import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Copy, Search, Plus } from 'lucide-react';
import SwitchFaceplate from '../components/network/SwitchFaceplate';

// Mock Data: IP Plan
interface IpRow {
    id: string;
    ip: string;
    hostname: string;
    mac: string;
    status: 'active' | 'reserved' | 'dhcp' | 'free';
    description: string;
    lastSeen: string;
}

interface SubnetGroup {
    id: string;
    cidr: string;
    vlan: number;
    vlanName: string;
    description: string;
    totalIps: number;
    usedIps: number;
    ips: IpRow[];
}

const MOCK_SUBNETS: SubnetGroup[] = [
    {
        id: 's1', cidr: '10.0.0.0/24', vlan: 1, vlanName: 'Management', description: 'Netzwerk-Management', totalIps: 254, usedIps: 12,
        ips: [
            { id: 'i1', ip: '10.0.0.1', hostname: 'core-switch-01', mac: 'AA:BB:CC:11:22:33', status: 'active', description: 'Core Switch Management', lastSeen: 'jetzt' },
            { id: 'i2', ip: '10.0.0.2', hostname: 'firewall-main', mac: 'AA:BB:CC:11:22:34', status: 'active', description: 'Firewall LAN Interface', lastSeen: 'jetzt' },
            { id: 'i3', ip: '10.0.0.10', hostname: '', mac: '', status: 'reserved', description: 'Reserviert für neuen Switch', lastSeen: '-' },
            { id: 'i4', ip: '10.0.0.100', hostname: '', mac: '', status: 'free', description: '', lastSeen: '-' },
        ],
    },
    {
        id: 's2', cidr: '10.0.10.0/24', vlan: 10, vlanName: 'VoIP', description: 'Telefonie-VLAN', totalIps: 254, usedIps: 45,
        ips: [
            { id: 'i5', ip: '10.0.10.1', hostname: 'voip-gw', mac: 'DD:EE:FF:11:22:33', status: 'active', description: 'VoIP Gateway', lastSeen: 'jetzt' },
            { id: 'i6', ip: '10.0.10.50', hostname: 'phone-empfang', mac: 'DD:EE:FF:44:55:66', status: 'dhcp', description: 'DHCP - Telefon Empfang', lastSeen: 'vor 2 Min.' },
            { id: 'i7', ip: '10.0.10.51', hostname: 'phone-buero1', mac: 'DD:EE:FF:77:88:99', status: 'dhcp', description: 'DHCP - Telefon Büro 1', lastSeen: 'vor 5 Min.' },
        ],
    },
    {
        id: 's3', cidr: '10.0.20.0/24', vlan: 20, vlanName: 'Clients', description: 'Arbeitsplätze', totalIps: 254, usedIps: 87,
        ips: [
            { id: 'i8', ip: '10.0.20.1', hostname: 'dhcp-server', mac: 'AA:11:BB:22:CC:33', status: 'active', description: 'DHCP Server', lastSeen: 'jetzt' },
            { id: 'i9', ip: '10.0.20.100', hostname: 'ws-mueller', mac: 'AA:11:BB:44:CC:55', status: 'dhcp', description: 'Arbeitsplatz Müller', lastSeen: 'vor 1 Std.' },
        ],
    },
];

export default function NetworkPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [showFaceplate, setShowFaceplate] = useState(false);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 bg-white/75 backdrop-blur border-b border-white/60 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-slate-800">IP-Plan</h1>
                    <p className="text-xs text-slate-500">Netzwerk-Dokumentation · {MOCK_SUBNETS.length} Subnetze</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="IP, Hostname oder MAC..."
                            className="pl-8 pr-3 w-56 input-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowFaceplate(!showFaceplate)}
                        className="btn-secondary text-xs px-3 py-1.5"
                    >
                        {showFaceplate ? 'IP-Tabelle' : 'Switch-Ansicht'}
                    </button>
                    <button className="btn-primary text-xs px-3 py-1.5">
                        <Plus size={14} />
                        Subnet
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {showFaceplate ? (
                    <div className="p-6">
                        <SwitchFaceplate />
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        {MOCK_SUBNETS.map(subnet => (
                            <SubnetTable key={subnet.id} subnet={subnet} searchQuery={searchQuery} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function SubnetTable({ subnet, searchQuery }: { subnet: SubnetGroup; searchQuery: string }) {
    const utilization = (subnet.usedIps / subnet.totalIps) * 100;

    const filteredIps = searchQuery
        ? subnet.ips.filter(ip =>
            ip.ip.includes(searchQuery) ||
            ip.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ip.mac.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : subnet.ips;

    if (searchQuery && filteredIps.length === 0) return null;

    return (
        <div className="card overflow-hidden">
            {/* Subnet Header */}
            <div className="px-5 py-3 bg-white/70 border-b border-white/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-slate-800">{subnet.cidr}</span>
                    <span className="badge badge-ok text-[10px]">VLAN {subnet.vlan} – {subnet.vlanName}</span>
                    <span className="text-xs text-slate-500">{subnet.description}</span>
                </div>
                <span className="text-xs text-slate-500">{subnet.usedIps}/{subnet.totalIps} belegt</span>
            </div>

            {/* Progress Bar */}
            <div className="px-5 py-1.5 border-b border-white/70">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
                    <div
                        className={cn(
                            'rounded-full transition-all',
                            utilization > 80 ? 'bg-red-400' : utilization > 50 ? 'bg-amber-400' : 'bg-green-400'
                        )}
                        style={{ width: `${utilization}%` }}
                    />
                </div>
            </div>

            {/* Table */}
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-white/70 bg-white/60">
                        <th className="table-header-cell text-slate-500 w-36">IP</th>
                        <th className="table-header-cell text-slate-500">Hostname</th>
                        <th className="table-header-cell text-slate-500 w-40">MAC</th>
                        <th className="table-header-cell text-slate-500 w-24">Status</th>
                        <th className="table-header-cell text-slate-500">Beschreibung</th>
                        <th className="table-header-cell text-slate-500 w-28">Last Seen</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/70">
                    {filteredIps.map(ip => (
                        <IpTableRow key={ip.id} ip={ip} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function IpTableRow({ ip }: { ip: IpRow }) {
    return (
        <tr className="hover:bg-white/70 group">
            {/* IP - copy-friendly */}
            <td className="table-cell font-mono font-medium text-slate-800">
                <div className="flex items-center gap-1.5">
                    {ip.ip}
                    <button
                        onClick={() => navigator.clipboard.writeText(ip.ip)}
                        className="copy-btn"
                        title="IP kopieren"
                    >
                        <Copy size={12} />
                    </button>
                </div>
            </td>
            {/* Hostname - inline-edit */}
            <td className="table-cell">
                <InlineEditCell value={ip.hostname} placeholder="–" />
            </td>
            {/* MAC */}
            <td className="table-cell font-mono text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                    {ip.mac || '–'}
                    {ip.mac && (
                        <button
                            onClick={() => navigator.clipboard.writeText(ip.mac)}
                            className="copy-btn"
                            title="MAC kopieren"
                        >
                            <Copy size={12} />
                        </button>
                    )}
                </div>
            </td>
            {/* Status */}
            <td className="table-cell">
                <span className={cn('badge text-[10px]',
                    ip.status === 'active' && 'bg-green-100 text-green-700',
                    ip.status === 'reserved' && 'bg-amber-100 text-amber-700',
                    ip.status === 'dhcp' && 'bg-blue-100 text-blue-700',
                    ip.status === 'free' && 'bg-slate-100 text-slate-500',
                )}>
                    {ip.status === 'active' ? 'Belegt' :
                        ip.status === 'reserved' ? 'Reserviert' :
                            ip.status === 'dhcp' ? 'DHCP' : 'Frei'}
                </span>
            </td>
            {/* Description - inline-edit */}
            <td className="table-cell">
                <InlineEditCell value={ip.description} placeholder="Beschreibung eingeben..." />
            </td>
            {/* Last Seen */}
            <td className="table-cell text-xs text-slate-400">{ip.lastSeen}</td>
        </tr>
    );
}

function InlineEditCell({ value, placeholder }: { value: string; placeholder: string }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    const handleSave = () => {
        setEditing(false);
        // In real app: mutation call here
        console.log('Saved:', text);
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onBlur={handleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setText(value); setEditing(false); } }}
                className="w-full text-sm px-1 py-0.5 border border-primary-300 rounded outline-none bg-primary-50/60"
            />
        );
    }

    return (
        <span
            onClick={() => setEditing(true)}
            className="inline-edit px-1 py-0.5 cursor-text text-slate-700"
        >
            {text || <span className="text-slate-300 italic">{placeholder}</span>}
        </span>
    );
}
