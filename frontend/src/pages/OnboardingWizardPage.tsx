import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight, SkipForward, Loader2, MapPin, Building, Plus, Trash2 } from 'lucide-react';
import { TenantService } from '../services/TenantService';
import { SiteService, RoomService, type CreateSiteRequest, type CreateRoomRequest } from '../services/SiteService';
import { NetworkService, type CreateSubnetRequest } from '../services/NetworkService';
import { DeviceService, type CreateDeviceRequest } from '../services/DeviceService';
import { DocumentationService } from '../services/DocumentationService';

// ─── Step definitions ────────────────────────────────────────────────────────

interface WizardStep {
    id: number;
    title: string;
    description: string;
}

const STEPS: WizardStep[] = [
    { id: 1, title: 'Grunddaten',         description: 'Tenant-Name und Kennung' },
    { id: 2, title: 'Standorte & Räume',  description: 'Physische Standorte erfassen' },
    { id: 3, title: 'Subnetze',           description: 'Netzwerksegmente hinzufügen' },
    { id: 4, title: 'Geräte',             description: 'Kerngeräte erfassen' },
    { id: 5, title: 'Firewall',           description: 'Firewall-Grunddaten' },
    { id: 6, title: 'Zugänge',            description: 'Credentials & Zugänge' },
    { id: 7, title: 'Abschluss',          description: 'Zusammenfassung & Score' },
];

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number; total: number }) {
    return (
        <div className="flex items-center justify-center gap-0 px-4">
            {STEPS.map((step, idx) => {
                const done    = step.id < current;
                const active  = step.id === current;
                const pending = step.id > current;
                return (
                    <div key={step.id} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={[
                                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                                    done    ? 'bg-green-600 text-white'       : '',
                                    active  ? 'bg-primary-600 text-white ring-2 ring-primary-300 ring-offset-2' : '',
                                    pending ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : '',
                                ].join(' ')}
                            >
                                {done ? <Check size={14} /> : step.id}
                            </div>
                            <span className={[
                                'text-[10px] font-medium hidden sm:block max-w-[64px] text-center leading-tight',
                                active  ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500',
                            ].join(' ')}>
                                {step.title}
                            </span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={[
                                'h-px w-8 sm:w-12 mx-1 mb-4 transition-colors',
                                done ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700',
                            ].join(' ')} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Step 1: Basics (read-only display) ─────────────────────────────────────

function Step1Basics({ tenantId }: { tenantId: string }) {
    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
    });
    const tenant = tenants?.find(t => t.id === tenantId);

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
                Der Tenant wurde bereits angelegt. Die Grunddaten sind hinterlegt.
            </p>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4 space-y-3">
                <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Name</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">
                        {tenant?.name ?? '—'}
                    </p>
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Kennung</p>
                    <p className="text-sm font-mono text-slate-900 dark:text-white mt-0.5">
                        {tenant?.identifier ?? '—'}
                    </p>
                </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
                Weiter zum nächsten Schritt um Standorte und Räume zu erfassen.
            </p>
        </div>
    );
}

// ─── Step 2: Sites + Rooms ───────────────────────────────────────────────────

interface SiteDraft {
    name: string;
    address: string;
    city: string;
    country: string;
    rooms: RoomDraft[];
}

interface RoomDraft {
    name: string;
    floor: string;
    description: string;
}

function Step2Sites({ tenantId, onComplete }: { tenantId: string; onComplete: () => void }) {
    const qc = useQueryClient();
    const [sites, setSites] = useState<SiteDraft[]>([
        { name: '', address: '', city: '', country: 'CH', rooms: [{ name: '', floor: '', description: '' }] },
    ]);
    const [error, setError]   = useState<string | null>(null);

    function addSite() {
        setSites(prev => [...prev, { name: '', address: '', city: '', country: 'CH', rooms: [] }]);
    }

    function removeSite(si: number) {
        setSites(prev => prev.filter((_, i) => i !== si));
    }

    function updateSite(si: number, field: keyof Omit<SiteDraft, 'rooms'>, value: string) {
        setSites(prev => prev.map((s, i) => i === si ? { ...s, [field]: value } : s));
    }

    function addRoom(si: number) {
        setSites(prev => prev.map((s, i) =>
            i === si ? { ...s, rooms: [...s.rooms, { name: '', floor: '', description: '' }] } : s
        ));
    }

    function removeRoom(si: number, ri: number) {
        setSites(prev => prev.map((s, i) =>
            i === si ? { ...s, rooms: s.rooms.filter((_, j) => j !== ri) } : s
        ));
    }

    function updateRoom(si: number, ri: number, field: keyof RoomDraft, value: string) {
        setSites(prev => prev.map((s, i) =>
            i === si
                ? { ...s, rooms: s.rooms.map((r, j) => j === ri ? { ...r, [field]: value } : r) }
                : s
        ));
    }

    async function handleSave() {
        const toSave = sites.filter(s => s.name.trim());
        if (toSave.length === 0) {
            onComplete();
            return;
        }

        setError(null);
        try {
            for (const site of toSave) {
                const req: CreateSiteRequest = {
                    name: site.name.trim(),
                    address: site.address || undefined,
                    city: site.city || undefined,
                    country: site.country || undefined,
                    tenantId,
                };
                const created = await SiteService.create(req);
                for (const room of site.rooms.filter(r => r.name.trim())) {
                    const rReq: CreateRoomRequest = {
                        name: room.name.trim(),
                        floor: room.floor || undefined,
                        description: room.description || undefined,
                        siteId: created.id,
                    };
                    await RoomService.create(rReq);
                }
            }
            await qc.invalidateQueries({ queryKey: ['sites', tenantId] });
            onComplete();
        } catch (e: any) {
            setError(e.message ?? 'Fehler beim Speichern');
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
                Erfasse die physischen Standorte deines Kunden (z.B. Büro, Datacenter) und die Räume darin.
            </p>

            {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {sites.map((site, si) => (
                    <div key={si} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex-1">
                                Standort {si + 1}
                            </span>
                            {sites.length > 1 && (
                                <button
                                    onClick={() => removeSite(si)}
                                    className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 size={13} />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="sm:col-span-2">
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Name *</label>
                                <input
                                    type="text"
                                    value={site.name}
                                    onChange={e => updateSite(si, 'name', e.target.value)}
                                    placeholder="z.B. Büro Zürich"
                                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Adresse</label>
                                <input
                                    type="text"
                                    value={site.address}
                                    onChange={e => updateSite(si, 'address', e.target.value)}
                                    placeholder="Musterstrasse 1"
                                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Stadt</label>
                                <input
                                    type="text"
                                    value={site.city}
                                    onChange={e => updateSite(si, 'city', e.target.value)}
                                    placeholder="Zürich"
                                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Land</label>
                                <input
                                    type="text"
                                    value={site.country}
                                    onChange={e => updateSite(si, 'country', e.target.value)}
                                    placeholder="CH"
                                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        {/* Rooms */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Building size={12} className="text-slate-400 shrink-0" />
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Räume</span>
                            </div>
                            {site.rooms.map((room, ri) => (
                                <div key={ri} className="flex gap-2 items-start">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={room.name}
                                            onChange={e => updateRoom(si, ri, 'name', e.target.value)}
                                            placeholder="Raumname *"
                                            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        <input
                                            type="text"
                                            value={room.floor}
                                            onChange={e => updateRoom(si, ri, 'floor', e.target.value)}
                                            placeholder="Etage"
                                            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeRoom(si, ri)}
                                        className="mt-1 text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => addRoom(si)}
                                className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                            >
                                <Plus size={12} />
                                Raum hinzufügen
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addSite}
                className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
                <Plus size={14} />
                Weiteren Standort hinzufügen
            </button>

            {/* Save is triggered by the parent "Weiter" button — expose handler via ref trick */}
            {/* Instead we surface it through the onComplete callback initiated from parent */}
            <div id="step2-save-trigger" data-handler="true" className="hidden" onClick={handleSave} />
        </div>
    );
}

// ─── Step 3: Subnets ─────────────────────────────────────────────────────────

function Step3Subnets({ tenantId }: { tenantId: string }) {
    const qc = useQueryClient();
    const { data: existing } = useQuery({
        queryKey: ['subnets', tenantId],
        queryFn: () => NetworkService.getSubnets(tenantId),
    });
    const [cidr, setCidr] = useState('');
    const [description, setDescription] = useState('');
    const [gateway, setGateway] = useState('');
    const [vlanTag, setVlanTag] = useState('');
    const [vlanName, setVlanName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleAdd() {
        if (!cidr.trim()) return;
        setError(null);
        setLoading(true);
        try {
            const req: CreateSubnetRequest = {
                cidr: cidr.trim(),
                description: description || undefined,
                gateway: gateway || undefined,
                vlanTag: vlanTag ? parseInt(vlanTag) : undefined,
                vlanName: vlanName || undefined,
                tenantId,
            };
            await NetworkService.createSubnet(req);
            await qc.invalidateQueries({ queryKey: ['subnets', tenantId] });
            setCidr(''); setDescription(''); setGateway(''); setVlanTag(''); setVlanName('');
        } catch (e: any) {
            setError(e.message ?? 'Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Erfasse die Netzwerksegmente des Kunden.</p>
            {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">CIDR *</label>
                        <input type="text" value={cidr} onChange={e => setCidr(e.target.value)} placeholder="192.168.1.0/24" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Gateway</label>
                        <input type="text" value={gateway} onChange={e => setGateway(e.target.value)} placeholder="192.168.1.1" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Beschreibung</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="z.B. LAN Büro" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">VLAN Tag</label>
                        <input type="number" value={vlanTag} onChange={e => setVlanTag(e.target.value)} placeholder="10" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">VLAN Name</label>
                        <input type="text" value={vlanName} onChange={e => setVlanName(e.target.value)} placeholder="VLAN-LAN" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                </div>
                <button onClick={handleAdd} disabled={!cidr.trim() || loading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Hinzufügen
                </button>
            </div>
            {(existing ?? []).length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {existing!.map(s => (
                        <div key={s.id} className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2 flex items-center justify-between">
                            <span className="text-sm font-mono text-green-800 dark:text-green-300">{s.cidr}</span>
                            <span className="text-xs text-green-600 dark:text-green-400">{s.description ?? (s.vlanName ? `VLAN ${s.vlanName}` : '')}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Step 4: Devices ─────────────────────────────────────────────────────────

const DEVICE_TYPES = ['SERVER', 'SWITCH', 'FIREWALL', 'ROUTER', 'WIFI_AP', 'OTHER'] as const;

function Step4Devices({ tenantId }: { tenantId: string }) {
    const qc = useQueryClient();
    const { data: sites } = useQuery({ queryKey: ['sites', tenantId], queryFn: () => SiteService.getByTenant(tenantId) });
    const { data: existing } = useQuery({ queryKey: ['devices', tenantId], queryFn: () => DeviceService.getAll(tenantId) });
    const [name, setName] = useState('');
    const [deviceType, setDeviceType] = useState('SERVER');
    const [model, setModel] = useState('');
    const [ip, setIp] = useState('');
    const [siteId, setSiteId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleAdd() {
        if (!name.trim()) return;
        setError(null);
        setLoading(true);
        try {
            const req: CreateDeviceRequest = {
                name: name.trim(),
                deviceType,
                model: model || undefined,
                ip: ip || undefined,
                siteId: siteId || undefined,
                status: 'ACTIVE',
                heightU: 1,
                rj45Ports: 0,
                sfpPorts: 0,
            };
            await DeviceService.create(req);
            await qc.invalidateQueries({ queryKey: ['devices', tenantId] });
            setName(''); setModel(''); setIp(''); setSiteId('');
        } catch (e: any) {
            setError(e.message ?? 'Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Erfasse die wichtigsten Geräte des Kunden (Quick-Capture).</p>
            {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Name *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Core-Switch-01" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Typ</label>
                        <select value={deviceType} onChange={e => setDeviceType(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                            {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Modell</label>
                        <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="z.B. Dell PowerEdge R740" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">IP</label>
                        <input type="text" value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.1.10" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Standort</label>
                        <select value={siteId} onChange={e => setSiteId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">— Kein Standort —</option>
                            {(sites ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={handleAdd} disabled={!name.trim() || loading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Hinzufügen
                </button>
            </div>
            {(existing ?? []).filter(d => d.deviceType !== 'FIREWALL').length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {existing!.filter(d => d.deviceType !== 'FIREWALL').map(d => (
                        <div key={d.id} className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-green-800 dark:text-green-300">{d.name}</span>
                            <span className="text-xs text-green-600 dark:text-green-400">{d.deviceType}{d.ip ? ` · ${d.ip}` : ''}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Step 5: Firewall ────────────────────────────────────────────────────────

function Step5Firewall({ tenantId }: { tenantId: string }) {
    const qc = useQueryClient();
    const { data: sites } = useQuery({ queryKey: ['sites', tenantId], queryFn: () => SiteService.getByTenant(tenantId) });
    const { data: existing } = useQuery({ queryKey: ['devices', tenantId], queryFn: () => DeviceService.getAll(tenantId) });
    const [name, setName] = useState('');
    const [model, setModel] = useState('');
    const [wanIp, setWanIp] = useState('');
    const [lanSubnet, setLanSubnet] = useState('');
    const [siteId, setSiteId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleAdd() {
        if (!name.trim()) return;
        setError(null);
        setLoading(true);
        try {
            const req: CreateDeviceRequest = {
                name: name.trim(),
                deviceType: 'FIREWALL',
                model: model || undefined,
                ip: wanIp || undefined,
                siteId: siteId || undefined,
                status: 'ACTIVE',
                heightU: 1,
                rj45Ports: 0,
                sfpPorts: 0,
            };
            await DeviceService.create(req);
            if (lanSubnet.trim()) {
                await NetworkService.createSubnet({ cidr: lanSubnet.trim(), description: `LAN (${name.trim()})`, tenantId });
            }
            await qc.invalidateQueries({ queryKey: ['devices', tenantId] });
            await qc.invalidateQueries({ queryKey: ['subnets', tenantId] });
            setName(''); setModel(''); setWanIp(''); setLanSubnet(''); setSiteId('');
        } catch (e: any) {
            setError(e.message ?? 'Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    }

    const firewalls = (existing ?? []).filter(d => d.deviceType === 'FIREWALL');

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Erfasse die Firewall-Grunddaten. Das LAN-Subnetz wird automatisch als Netzwerksegment angelegt.</p>
            {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Name *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="z.B. FW-Zürich-01" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Modell</label>
                        <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="z.B. FortiGate 60F" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">WAN IP</label>
                        <input type="text" value={wanIp} onChange={e => setWanIp(e.target.value)} placeholder="1.2.3.4" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">LAN Subnetz</label>
                        <input type="text" value={lanSubnet} onChange={e => setLanSubnet(e.target.value)} placeholder="192.168.1.0/24" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Standort</label>
                        <select value={siteId} onChange={e => setSiteId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="">— Kein Standort —</option>
                            {(sites ?? []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={handleAdd} disabled={!name.trim() || loading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Hinzufügen
                </button>
            </div>
            {firewalls.length > 0 && (
                <div className="space-y-2">
                    {firewalls.map(d => (
                        <div key={d.id} className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-4 py-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-green-800 dark:text-green-300">{d.name}</span>
                            <span className="text-xs text-green-600 dark:text-green-400">{d.model ?? 'FIREWALL'}{d.ip ? ` · ${d.ip}` : ''}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Step 6: Credentials ─────────────────────────────────────────────────────

function Step6Credentials({ tenantId }: { tenantId: string }) {
    const [mfaRequirements, setMfaRequirements] = useState('');
    const [breakGlassAccounts, setBreakGlassAccounts] = useState('');
    const [privilegedAccessPaths, setPrivilegedAccessPaths] = useState('');
    const [adminAccessConcept, setAdminAccessConcept] = useState('');
    const [notes, setNotes] = useState('');
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSave() {
        setError(null);
        setLoading(true);
        try {
            await DocumentationService.updateSection(tenantId, 'access_credentials', {
                structuredData: {
                    mfaRequirements: mfaRequirements || undefined,
                    breakGlassAccounts: breakGlassAccounts || undefined,
                    privilegedAccessPaths: privilegedAccessPaths || undefined,
                    adminAccessConcept: adminAccessConcept || undefined,
                },
                notes: notes || undefined,
            });
            setSaved(true);
        } catch (e: any) {
            setError(e.message ?? 'Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">Dokumentiere die Zugänge und Credential-Konzepte des Kunden.</p>
            {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
            {saved && <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400 flex items-center gap-2"><Check size={14} /> Gespeichert</div>}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {([
                    ['MFA-Anforderungen', mfaRequirements, setMfaRequirements, 'z.B. TOTP für alle Admin-Konten, Ausnahmen dokumentieren'],
                    ['Break-Glass Accounts', breakGlassAccounts, setBreakGlassAccounts, 'z.B. lokaler Admin, IPMI-Zugang'],
                    ['Privileged Access Paths', privilegedAccessPaths, setPrivilegedAccessPaths, 'z.B. VPN → Jump Host → Zielsystem'],
                    ['Admin Access Konzept', adminAccessConcept, setAdminAccessConcept, 'z.B. RBAC, PAM, Tier-Modell'],
                ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
                    <div key={label}>
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
                        <textarea value={val} onChange={e => setter(e.target.value)} placeholder={ph} rows={2} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                    </div>
                ))}
                <div>
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notizen</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Weitere Hinweise…" rows={2} className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
                </div>
            </div>
            <button onClick={handleSave} disabled={loading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Speichern
            </button>
        </div>
    );
}

// ─── Review step ─────────────────────────────────────────────────────────────

function Step7Review({ tenantId }: { tenantId: string }) {
    const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: TenantService.getAll });
    const { data: health }  = useQuery({
        queryKey: ['tenant', tenantId, 'health'],
        queryFn: () => TenantService.getHealth(tenantId),
        enabled: !!tenantId,
    });
    const tenant = tenants?.find(t => t.id === tenantId);

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
                Der Setup-Assistent ist abgeschlossen. Hier ist eine Übersicht des aktuellen Dokumentationsstands.
            </p>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {tenant?.name ?? 'Tenant'}
                    </span>
                    {health && (
                        <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                            {Math.round(health.overallScore)}%
                        </span>
                    )}
                </div>
                {health?.categories && (
                    <div className="space-y-1.5">
                        {health.categories.map(c => (
                            <div key={c.category} className="flex items-center gap-3">
                                <span className="text-xs text-slate-500 dark:text-slate-400 w-28 truncate">{c.category}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            c.score >= 70 ? 'bg-green-500' : c.score >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${c.score}%` }}
                                    />
                                </div>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-8 text-right">
                                    {Math.round(c.score)}%
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500">
                Du kannst den Dokumentationsstand jederzeit über das Tenant-Dashboard einsehen und verbessern.
            </p>
        </div>
    );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export default function OnboardingWizardPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [step2Pending] = useState(false);

    const tid = tenantId!;

    function goBack()  { if (step > 1) setStep(s => s - 1); }
    function goNext()  { if (step < STEPS.length) setStep(s => s + 1); }
    function skip()    { goNext(); }
    function finish()  { navigate(`/tenants/${tid}`); }

    async function handleNext() {
        if (step === 2) {
            // Trigger the save in Step2 via DOM event
            const el = document.getElementById('step2-save-trigger');
            if (el) {
                el.click();
                // The step2 component calls onComplete which triggers goNext
                return;
            }
        }
        if (step === STEPS.length) {
            finish();
        } else {
            goNext();
        }
    }

    const currentStep = STEPS[step - 1];
    const progress = ((step - 1) / (STEPS.length - 1)) * 100;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden my-auto">

                {/* Header */}
                <div className="px-8 pt-8 pb-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Tenant einrichten</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Schritt {step} von {STEPS.length} — {currentStep.description}
                            </p>
                        </div>
                        <button
                            onClick={finish}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors font-medium"
                        >
                            Abbrechen
                        </button>
                    </div>
                    <StepIndicator current={step} total={STEPS.length} />
                </div>

                {/* Content */}
                <div className="px-8 py-6 flex-1 overflow-y-auto min-h-[320px]">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">{currentStep.title}</h2>

                    {step === 1 && <Step1Basics tenantId={tid} />}
                    {step === 2 && (
                        <Step2Sites
                            tenantId={tid}
                            onComplete={goNext}
                        />
                    )}
                    {step === 3 && <Step3Subnets tenantId={tid} />}
                    {step === 4 && <Step4Devices tenantId={tid} />}
                    {step === 5 && <Step5Firewall tenantId={tid} />}
                    {step === 6 && <Step6Credentials tenantId={tid} />}
                    {step === 7 && <Step7Review tenantId={tid} />}
                </div>

                {/* Footer */}
                <div className="px-8 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    {/* Progress bar */}
                    <div className="w-full h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                            className="h-full bg-primary-500 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={goBack}
                            disabled={step === 1}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={15} />
                            Zurück
                        </button>

                        <div className="flex items-center gap-2">
                            {step < STEPS.length && step !== 2 && (
                                <button
                                    onClick={skip}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                >
                                    <SkipForward size={14} />
                                    Überspringen
                                </button>
                            )}

                            <button
                                onClick={handleNext}
                                disabled={step2Pending}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {step2Pending && <Loader2 size={14} className="animate-spin" />}
                                {step === STEPS.length ? (
                                    <>
                                        <Check size={14} />
                                        Abschliessen
                                    </>
                                ) : (
                                    <>
                                        Weiter
                                        <ChevronRight size={15} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
