import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import { Globe, ChevronRight, Loader2, X } from 'lucide-react';
import { NetworkService, type Subnet, type IpAddress } from '../services/NetworkService';
import { ProviderService } from '../services/ProviderService';
import { TenantService } from '../services/TenantService';

type SlotStatus = 'free' | 'used' | 'reserved' | 'network' | 'broadcast';

interface IpSlot {
    address: string;
    status: SlotStatus;
    record?: IpAddress;
}

function ipToInt(ip: string): number {
    return ip.split('.').reduce((acc, o) => acc * 256 + parseInt(o, 10), 0) >>> 0;
}

function intToIp(n: number): string {
    return [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.');
}

function buildSlots(cidr: string, records: IpAddress[]): IpSlot[] | null {
    const [base, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    const size = 2 ** (32 - prefix);
    if (Number.isNaN(prefix) || size > 256) return null;

    const byAddress = new Map(records.map(r => [r.address, r]));
    const network = ipToInt(base) & (~(size - 1) >>> 0);

    return Array.from({ length: size }, (_, i) => {
        const address = intToIp(network + i);
        const record = byAddress.get(address);
        let status: SlotStatus = 'free';
        if (i === 0) status = 'network';
        else if (i === size - 1) status = 'broadcast';
        else if (record?.status === 'reserved') status = 'reserved';
        else if (record) status = 'used';
        return { address, status, record };
    });
}

const SLOT_CLASSES: Record<SlotStatus, string> = {
    free: 'bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200',
    used: 'bg-primary-500 text-white',
    reserved: 'bg-amber-400 text-white',
    network: 'bg-slate-300 dark:bg-slate-600',
    broadcast: 'bg-slate-300 dark:bg-slate-600',
};

export default function DatacenterPage() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [dialogSlot, setDialogSlot] = useState<IpSlot | null>(null);
    const queryClient = useQueryClient();

    const { data: ranges, isLoading, error } = useQuery({
        queryKey: ['public-subnets'],
        queryFn: NetworkService.getPublicSubnets,
    });

    const selectedRange: Subnet | undefined =
        ranges?.find(r => r.id === selectedId) ?? ranges?.[0];

    const { data: ips } = useQuery({
        queryKey: ['public-ips', selectedRange?.id],
        queryFn: () => NetworkService.getIps(selectedRange!.id),
        enabled: !!selectedRange,
    });

    const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: TenantService.getAll });
    const customers = useMemo(() => (tenants ?? []).filter(t => t.type === 'CUSTOMER'), [tenants]);

    const slots = useMemo(
        () => (selectedRange && ips ? buildSlots(selectedRange.cidr, ips) : null),
        [selectedRange, ips]
    );

    const saveMutation = useMutation({
        mutationFn: async (input: { slot: IpSlot; tenantId: string | null; usage: string; reserved: boolean }) => {
            const { slot, tenantId, usage, reserved } = input;
            const status = reserved ? 'reserved' : 'active';
            let record = slot.record;
            if (!record) {
                record = await NetworkService.createIp({
                    subnetId: selectedRange!.id,
                    address: slot.address,
                    status,
                    description: usage || undefined,
                });
            } else {
                record = await NetworkService.updateIp(record.id, { status, description: usage || undefined });
            }
            await ProviderService.setAssignment('ips', record.id, tenantId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['public-ips', selectedRange?.id] });
            setDialogSlot(null);
        },
    });

    if (isLoading) {
        return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;
    }
    if (error) {
        return <div className="p-12 text-center text-red-500">Fehler beim Laden der Public Ranges: {(error as Error).message}</div>;
    }

    const usedCount = ips?.filter(ip => ip.status !== 'reserved').length ?? 0;
    const reservedCount = ips?.filter(ip => ip.status === 'reserved').length ?? 0;

    return (
        <div className="page">
            <div className="mb-6">
                <h1 className="page-title">Datacenter · Public IPs</h1>
                <p className="page-subtitle">Öffentliche IP-Ranges des MSP, Kunden zuweisbar</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Range list */}
                <div className="card overflow-hidden lg:col-span-1">
                    <div className="px-4 py-3 border-b border-white/70 dark:border-white/10 font-semibold text-sm text-slate-800 dark:text-white">
                        Ranges
                    </div>
                    {(ranges ?? []).map(range => (
                        <button
                            key={range.id}
                            onClick={() => setSelectedId(range.id)}
                            className={cn(
                                'w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-primary-50 dark:hover:bg-white/5',
                                selectedRange?.id === range.id && 'bg-primary-50 dark:bg-white/10'
                            )}
                        >
                            <div>
                                <div className="font-mono font-medium text-slate-800 dark:text-white">{range.cidr}</div>
                                <div className="text-xs text-slate-500">{range.description ?? '—'}</div>
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                        </button>
                    ))}
                    {(ranges ?? []).length === 0 && (
                        <div className="p-6 text-center text-sm text-slate-500">
                            <Globe size={24} className="mx-auto mb-2 text-slate-300" />
                            Keine öffentlichen Ranges dokumentiert.
                        </div>
                    )}
                </div>

                {/* Grid */}
                <div className="lg:col-span-3 space-y-4">
                    {selectedRange && (
                        <>
                            <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400">
                                <span><b>{usedCount}</b> vergeben</span>
                                <span><b>{reservedCount}</b> reserviert</span>
                                <span><b>{selectedRange.totalIps - (ips?.length ?? 0)}</b> frei</span>
                            </div>
                            {slots ? (
                                <div className="card p-4 grid grid-cols-8 sm:grid-cols-12 md:grid-cols-12 gap-1">
                                    {slots.map(slot => (
                                        <button
                                            key={slot.address}
                                            title={`${slot.address}${slot.record?.assignedTenantName ? ` · ${slot.record.assignedTenantName}` : ''}${slot.record?.description ? ` · ${slot.record.description}` : ''}`}
                                            disabled={slot.status === 'network' || slot.status === 'broadcast'}
                                            onClick={() => setDialogSlot(slot)}
                                            className={cn('h-7 rounded text-[9px] font-mono flex items-center justify-center', SLOT_CLASSES[slot.status])}
                                        >
                                            {slot.address.split('.')[3]}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="card p-6 text-sm text-slate-500">
                                    Range zu groß für Rasteransicht – dokumentierte IPs: {ips?.length ?? 0}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Assign dialog */}
            {dialogSlot && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white/90 dark:bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/60 dark:border-white/10">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white font-mono">{dialogSlot.address}</h2>
                            <button onClick={() => setDialogSlot(null)} className="btn-icon"><X size={16} /></button>
                        </div>
                        <form onSubmit={e => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const tenantId = (fd.get('tenantId') as string) || null;
                            saveMutation.mutate({
                                slot: dialogSlot,
                                tenantId,
                                usage: fd.get('usage') as string,
                                reserved: fd.get('reserved') === 'on',
                            });
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Kunde</label>
                                    <select name="tenantId" defaultValue={dialogSlot.record?.assignedTenantId ?? ''} className="input">
                                        <option value="">— nicht zugewiesen —</option>
                                        {customers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Verwendung</label>
                                    <input name="usage" defaultValue={dialogSlot.record?.description ?? ''} placeholder="z.B. Firewall WAN1" className="input" />
                                </div>
                                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <input type="checkbox" name="reserved" defaultChecked={dialogSlot.record?.status === 'reserved'} className="rounded" />
                                    Reserviert
                                </label>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setDialogSlot(null)} className="btn-secondary">Abbrechen</button>
                                <button type="submit" disabled={saveMutation.isPending} className="btn-primary disabled:opacity-50">
                                    {saveMutation.isPending ? 'Speichere...' : 'Speichern'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
