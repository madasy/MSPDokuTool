import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wifi, Plus, Loader2, Trash2, X, Search } from 'lucide-react';
import { AccessPointService, type AccessPoint, type CreateAccessPointRequest } from '../services/AccessPointService';
import { SiteService } from '../services/SiteService';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';

const STATUS_COLORS: Record<string, string> = {
    active:   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    planned:  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

const MOUNT_LABELS: Record<string, string> = {
    ceiling: 'Decke',
    wall:    'Wand',
    desk:    'Tisch',
};

export default function AccessPointsPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const [showModal, setShowModal] = useState(false);
    const [search, setSearch] = useState('');

    // Form state
    const [form, setForm] = useState<Partial<CreateAccessPointRequest>>({
        mountType: 'ceiling',
        status: 'active',
        ssids: [],
    });
    const [ssidsInput, setSsidsInput] = useState('');

    const { data: accessPoints, isLoading } = useQuery({
        queryKey: ['access-points', tenantId],
        queryFn: () => AccessPointService.getByTenant(tenantId!),
        enabled: !!tenantId,
    });

    const { data: sites } = useQuery({
        queryKey: ['sites', tenantId],
        queryFn: () => SiteService.getByTenant(tenantId!),
        enabled: !!tenantId,
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateAccessPointRequest) => AccessPointService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['access-points', tenantId] });
            addToast({ type: 'success', title: 'Access Point erstellt' });
            closeModal();
        },
        onError: () => addToast({ type: 'error', title: 'Fehler beim Erstellen' }),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => AccessPointService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['access-points', tenantId] });
            addToast({ type: 'success', title: 'Access Point gelöscht' });
        },
        onError: () => addToast({ type: 'error', title: 'Fehler beim Löschen' }),
    });

    function closeModal() {
        setShowModal(false);
        setForm({ mountType: 'ceiling', status: 'active', ssids: [] });
        setSsidsInput('');
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.siteId || !form.name) return;
        createMutation.mutate({
            siteId: form.siteId,
            name: form.name,
            model: form.model || undefined,
            macAddress: form.macAddress || undefined,
            ipAddress: form.ipAddress || undefined,
            locationDescription: form.locationDescription || undefined,
            floor: form.floor || undefined,
            room: form.room || undefined,
            mountType: form.mountType ?? 'ceiling',
            status: form.status ?? 'active',
            channel: form.channel || undefined,
            ssids: ssidsInput ? ssidsInput.split(',').map(s => s.trim()).filter(Boolean) : [],
        });
    }

    const filtered = (accessPoints ?? []).filter(ap => {
        const q = search.toLowerCase();
        return (
            ap.name.toLowerCase().includes(q) ||
            ap.siteName.toLowerCase().includes(q) ||
            (ap.model ?? '').toLowerCase().includes(q) ||
            (ap.ipAddress ?? '').includes(q) ||
            (ap.macAddress ?? '').toLowerCase().includes(q) ||
            (ap.floor ?? '').toLowerCase().includes(q) ||
            (ap.room ?? '').toLowerCase().includes(q)
        );
    });

    const total = accessPoints?.length ?? 0;
    const countByStatus = (status: string) => (accessPoints ?? []).filter(ap => ap.status === status).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                        <Wifi size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Access Points</h1>
                        <p className="text-xs text-slate-400">{total} AP{total !== 1 ? 's' : ''} gesamt</p>
                    </div>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                    <Plus size={16} />
                    Neuer AP
                </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{total}</p>
                    <p className="text-xs text-slate-400 mt-1">Gesamt</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{countByStatus('active')}</p>
                    <p className="text-xs text-slate-400 mt-1">Aktiv</p>
                </div>
                <div className="card p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{countByStatus('planned')}</p>
                    <p className="text-xs text-slate-400 mt-1">Geplant</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    className="input pl-8"
                    placeholder="Suchen nach Name, Modell, IP, MAC, Standort..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Modell</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">IP</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">MAC</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Standort</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Etage</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Raum</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Mount</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">SSIDs</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-4 py-10 text-center text-slate-400 text-sm">
                                        {search ? 'Keine Treffer.' : 'Noch keine Access Points vorhanden.'}
                                    </td>
                                </tr>
                            ) : filtered.map((ap: AccessPoint) => (
                                <tr key={ap.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Wifi size={14} className="text-primary-400 flex-shrink-0" />
                                            {ap.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{ap.model ?? '—'}</td>
                                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">{ap.ipAddress ?? '—'}</td>
                                    <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">{ap.macAddress ?? '—'}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{ap.siteName}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{ap.floor ?? '—'}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{ap.room ?? '—'}</td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap capitalize">
                                        {MOUNT_LABELS[ap.mountType] ?? ap.mountType}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', STATUS_COLORS[ap.status] ?? STATUS_COLORS.inactive)}>
                                            {ap.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 max-w-[160px]">
                                        {ap.ssids.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {ap.ssids.map(ssid => (
                                                    <span key={ssid} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono truncate max-w-[100px]">
                                                        {ssid}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : <span className="text-slate-400">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => deleteMutation.mutate(ap.id)}
                                            disabled={deleteMutation.isPending}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Löschen"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/50" onClick={closeModal} />
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Wifi size={16} className="text-primary-500" />
                                Neuer Access Point
                            </h2>
                            <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Name */}
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                        Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="z.B. AP-OG1-Buero"
                                        value={form.name ?? ''}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        required
                                    />
                                </div>

                                {/* Site */}
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                                        Standort <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="input"
                                        value={form.siteId ?? ''}
                                        onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))}
                                        required
                                    >
                                        <option value="">Standort wählen...</option>
                                        {(sites ?? []).map(site => (
                                            <option key={site.id} value={site.id}>{site.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Model */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Modell</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="z.B. Unifi U6 Pro"
                                        value={form.model ?? ''}
                                        onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                                    />
                                </div>

                                {/* IP Address */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">IP-Adresse</label>
                                    <input
                                        type="text"
                                        className="input font-mono"
                                        placeholder="z.B. 10.0.0.50"
                                        value={form.ipAddress ?? ''}
                                        onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))}
                                    />
                                </div>

                                {/* MAC Address */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">MAC-Adresse</label>
                                    <input
                                        type="text"
                                        className="input font-mono"
                                        placeholder="AA:BB:CC:DD:EE:FF"
                                        value={form.macAddress ?? ''}
                                        onChange={e => setForm(f => ({ ...f, macAddress: e.target.value }))}
                                    />
                                </div>

                                {/* Channel */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Kanal</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="z.B. 6, 36, auto"
                                        value={form.channel ?? ''}
                                        onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                                    />
                                </div>

                                {/* Floor */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Etage</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="z.B. EG, OG1"
                                        value={form.floor ?? ''}
                                        onChange={e => setForm(f => ({ ...f, floor: e.target.value }))}
                                    />
                                </div>

                                {/* Room */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Raum</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="z.B. Besprechung 1"
                                        value={form.room ?? ''}
                                        onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                                    />
                                </div>

                                {/* Mount type */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Montage</label>
                                    <select
                                        className="input"
                                        value={form.mountType ?? 'ceiling'}
                                        onChange={e => setForm(f => ({ ...f, mountType: e.target.value }))}
                                    >
                                        <option value="ceiling">Decke</option>
                                        <option value="wall">Wand</option>
                                        <option value="desk">Tisch</option>
                                    </select>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Status</label>
                                    <select
                                        className="input"
                                        value={form.status ?? 'active'}
                                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                    >
                                        <option value="active">Aktiv</option>
                                        <option value="planned">Geplant</option>
                                        <option value="inactive">Inaktiv</option>
                                    </select>
                                </div>

                                {/* SSIDs */}
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">SSIDs</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="Kommagetrennt: Corp-WiFi, Guest, IoT"
                                        value={ssidsInput}
                                        onChange={e => setSsidsInput(e.target.value)}
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Mehrere SSIDs kommagetrennt eingeben</p>
                                </div>

                                {/* Location description */}
                                <div className="col-span-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Standortbeschreibung</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="z.B. Über dem Eingang, neben Fenster"
                                        value={form.locationDescription ?? ''}
                                        onChange={e => setForm(f => ({ ...f, locationDescription: e.target.value }))}
                                    />
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-700 mt-4">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || !form.name || !form.siteId}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    {createMutation.isPending
                                        ? <Loader2 size={14} className="animate-spin" />
                                        : <Plus size={14} />}
                                    Erstellen
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
