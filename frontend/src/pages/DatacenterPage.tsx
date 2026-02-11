import { useState } from 'react';
import { cn } from '../lib/utils';
import { Globe, ChevronRight, Plus } from 'lucide-react';

// Mock Data: Public IP Ranges
const MOCK_RANGES = [
    {
        id: 'r1',
        cidr: '203.0.113.0/24',
        description: 'Primary Public Block',
        ips: Array.from({ length: 256 }, (_, i) => ({
            address: `203.0.113.${i}`,
            status: i === 0 ? 'network' as const :
                i === 255 ? 'broadcast' as const :
                    i >= 1 && i <= 3 ? 'reserved' as const :
                        i >= 10 && i <= 15 ? 'used' as const :
                            i >= 20 && i <= 22 ? 'used' as const :
                                i === 50 ? 'reserved' as const :
                                    'free' as const,
            tenant: i >= 10 && i <= 15 ? 'Kanzlei Müller' :
                i >= 20 && i <= 22 ? 'Acme GmbH' : undefined,
            usage: i === 10 ? 'Firewall WAN1' :
                i === 11 ? 'Mail Gateway' :
                    i === 20 ? 'Web Server' : undefined,
        })),
    },
    {
        id: 'r2',
        cidr: '198.51.100.0/28',
        description: 'Secondary Block (klein)',
        ips: Array.from({ length: 16 }, (_, i) => ({
            address: `198.51.100.${i}`,
            status: i === 0 ? 'network' as const :
                i === 15 ? 'broadcast' as const :
                    i >= 1 && i <= 3 ? 'used' as const :
                        'free' as const,
            tenant: i >= 1 && i <= 3 ? 'Logistik AG' : undefined,
            usage: i === 1 ? 'VPN Gateway' : undefined,
        })),
    },
];

type IpStatus = 'free' | 'used' | 'reserved' | 'network' | 'broadcast';

interface IpEntry {
    address: string;
    status: IpStatus;
    tenant?: string;
    usage?: string;
}

export default function DatacenterPage() {
    const [selectedRange, setSelectedRange] = useState(MOCK_RANGES[0]);
    const [hoveredIp, setHoveredIp] = useState<IpEntry | null>(null);

    const usedCount = selectedRange.ips.filter(ip => ip.status === 'used').length;
    const reservedCount = selectedRange.ips.filter(ip => ip.status === 'reserved').length;
    const freeCount = selectedRange.ips.filter(ip => ip.status === 'free').length;

    return (
        <div className="flex h-full">
            {/* Left: Range List */}
            <div className="w-72 border-r border-white/60 bg-white/80 backdrop-blur flex-shrink-0 flex flex-col">
                <div className="p-4 border-b border-white/70">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Globe size={16} className="text-primary-500" />
                            IP Ranges
                        </h2>
                        <button className="btn-icon text-primary-500">
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {MOCK_RANGES.map(range => (
                        <button
                            key={range.id}
                            onClick={() => setSelectedRange(range)}
                            className={cn(
                                'w-full text-left px-4 py-3 border-b border-white/70 flex items-center gap-3 transition-colors',
                                selectedRange.id === range.id
                                    ? 'bg-primary-50 border-l-2 border-l-primary-400'
                                    : 'hover:bg-white/70'
                            )}
                        >
                            <div className="flex-1">
                                <p className="text-sm font-mono font-semibold text-slate-800">{range.cidr}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{range.description}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Right: IP Grid */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="px-6 py-4 bg-white/75 backdrop-blur border-b border-white/60 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 font-mono">{selectedRange.cidr}</h2>
                        <p className="text-xs text-slate-500">{selectedRange.description}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-slate-200 border border-slate-300" /> Frei ({freeCount})
                        </span>
                        <span className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Belegt ({usedCount})
                        </span>
                        <span className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Reserviert ({reservedCount})
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-2 bg-white/70 border-b border-white/70">
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                        <div className="bg-red-400" style={{ width: `${(usedCount / selectedRange.ips.length) * 100}%` }} />
                        <div className="bg-amber-400" style={{ width: `${(reservedCount / selectedRange.ips.length) * 100}%` }} />
                    </div>
                </div>

                {/* IP Grid */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 lg:grid-cols-16 gap-1">
                        {selectedRange.ips.map((ip) => {
                            const lastOctet = ip.address.split('.').pop();
                            return (
                                <div
                                    key={ip.address}
                                    onMouseEnter={() => setHoveredIp(ip)}
                                    onMouseLeave={() => setHoveredIp(null)}
                                    className={cn(
                                        'relative aspect-square rounded border text-[10px] font-mono flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:z-10 hover:shadow-md',
                                        ip.status === 'free' && 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100',
                                        ip.status === 'used' && 'bg-red-50 border-red-200 text-red-700 font-semibold',
                                        ip.status === 'reserved' && 'bg-amber-50 border-amber-200 text-amber-700',
                                        ip.status === 'network' && 'bg-slate-200 border-slate-300 text-slate-500',
                                        ip.status === 'broadcast' && 'bg-slate-200 border-slate-300 text-slate-500',
                                    )}
                                    title={ip.tenant ? `${ip.address} → ${ip.tenant}${ip.usage ? ` (${ip.usage})` : ''}` : ip.address}
                                >
                                    .{lastOctet}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Hover Detail Bar */}
                <div className="h-10 px-6 border-t border-white/60 bg-white/75 backdrop-blur flex items-center text-xs text-slate-500 gap-6">
                    {hoveredIp ? (
                        <>
                            <span className="font-mono font-semibold text-slate-800">{hoveredIp.address}</span>
                            <span className={cn(
                                'badge',
                                hoveredIp.status === 'free' && 'badge-planned',
                                hoveredIp.status === 'used' && 'badge-error',
                                hoveredIp.status === 'reserved' && 'badge-warning',
                            )}>
                                {hoveredIp.status === 'free' ? 'Frei' :
                                    hoveredIp.status === 'used' ? 'Belegt' :
                                        hoveredIp.status === 'reserved' ? 'Reserviert' :
                                            hoveredIp.status}
                            </span>
                            {hoveredIp.tenant && <span>Tenant: <strong>{hoveredIp.tenant}</strong></span>}
                            {hoveredIp.usage && <span className="italic">{hoveredIp.usage}</span>}
                        </>
                    ) : (
                        <span>Hover über eine IP für Details</span>
                    )}
                </div>
            </div>
        </div>
    );
}
