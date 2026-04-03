import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Loader2, ChevronDown, ChevronRight, MapPin, DoorOpen, X, Layers, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SiteService, RoomService } from '../services/SiteService';
import { RackService } from '../services/RackService';
import type { Site, Room } from '../services/SiteService';
import { useToast } from '../components/ui/Toast';

// ── Expanded site card with rooms ──────────────────────────────────────────

function SiteCard({
    site,
    tenantId,
    onAddRoom,
}: {
    site: Site;
    tenantId: string;
    onAddRoom: (site: Site) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    const { data: rooms, isLoading: roomsLoading } = useQuery({
        queryKey: ['rooms', site.id],
        queryFn: () => RoomService.getBySite(site.id),
        enabled: expanded,
    });

    const addressLine = [site.address, site.city, site.country].filter(Boolean).join(', ');

    return (
        <div className="card overflow-hidden">
            {/* Site header row */}
            <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                onClick={() => setExpanded(prev => !prev)}
            >
                <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{site.name}</p>
                    {addressLine && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={10} />
                            {addressLine}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                        {site.roomCount} {site.roomCount === 1 ? 'Raum' : 'Räume'}
                    </span>
                    {expanded
                        ? <ChevronDown size={16} className="text-slate-400" />
                        : <ChevronRight size={16} className="text-slate-400" />
                    }
                </div>
            </button>

            {/* Expanded rooms list */}
            {expanded && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                    {roomsLoading ? (
                        <div className="flex justify-center items-center py-6">
                            <Loader2 className="animate-spin h-5 w-5 text-primary-400" />
                        </div>
                    ) : rooms && rooms.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                            {rooms.map((room: Room) => (
                                <RoomRow key={room.id} room={room} tenantId={tenantId} siteId={site.id} />
                            ))}
                        </div>
                    ) : (
                        <div className="py-6 text-center">
                            <DoorOpen size={24} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-xs text-slate-400">Noch keine Räume vorhanden.</p>
                        </div>
                    )}

                    <div className="p-3 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                            onClick={() => onAddRoom(site)}
                            className="btn-secondary text-xs w-full justify-center"
                        >
                            <Plus size={14} />
                            Raum hinzufügen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function RoomRow({ room, tenantId, siteId }: { room: Room; tenantId: string; siteId: string }) {
    const [showAddRack, setShowAddRack] = useState(false);
    const [rackName, setRackName] = useState('');
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const createRackMutation = useMutation({
        mutationFn: () => RackService.createInRoom(room.id, { name: rackName, heightUnits: 42 }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['racks'] });
            setRackName('');
            setShowAddRack(false);
            addToast({ type: 'success', title: 'Rack erstellt' });
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler beim Erstellen' });
        },
    });

    const deleteRoomMutation = useMutation({
        mutationFn: () => RoomService.delete(room.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['sites'] });
            addToast({ type: 'success', title: 'Raum gelöscht' });
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler', message: 'Raum konnte nicht gelöscht werden. Möglicherweise enthält er noch Racks.' });
        },
    });

    return (
        <div className="px-4 py-3 group">
            <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center flex-shrink-0">
                    <DoorOpen size={14} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{room.name}</p>
                    {room.floor && (
                        <p className="text-xs text-slate-400">Etage: {room.floor}</p>
                    )}
                </div>
                {room.rackCount > 0 ? (
                    <Link
                        to={`/tenants/${tenantId}/racks`}
                        className="text-xs text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 hover:underline"
                    >
                        <Layers size={10} />
                        {room.rackCount} {room.rackCount === 1 ? 'Rack' : 'Racks'} →
                    </Link>
                ) : (
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                        <Layers size={10} />
                        0 Racks
                    </span>
                )}
                <button
                    onClick={() => setShowAddRack(!showAddRack)}
                    className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 cursor-pointer"
                    title="Rack hinzufügen"
                >
                    <Plus size={12} /> Rack
                </button>
                <button
                    onClick={() => {
                        if (confirm(`Raum "${room.name}" wirklich löschen?`)) {
                            deleteRoomMutation.mutate();
                        }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all cursor-pointer p-1"
                    title="Raum löschen"
                >
                    <Trash2 size={13} />
                </button>
            </div>
            {showAddRack && (
                <div className="flex items-center gap-2 mt-2 ml-10">
                    <input
                        type="text"
                        value={rackName}
                        onChange={e => setRackName(e.target.value)}
                        placeholder="Rack-Name (z.B. Rack-01)"
                        className="input text-xs py-1.5 flex-1"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter' && rackName.trim()) createRackMutation.mutate(); if (e.key === 'Escape') setShowAddRack(false); }}
                    />
                    <button
                        onClick={() => createRackMutation.mutate()}
                        disabled={!rackName.trim() || createRackMutation.isPending}
                        className="btn-primary text-xs py-1.5 px-3"
                    >
                        {createRackMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Erstellen'}
                    </button>
                    <button onClick={() => setShowAddRack(false)} className="btn-icon p-1">
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Create Site Modal ───────────────────────────────────────────────────────

function CreateSiteModal({
    tenantId,
    onClose,
}: {
    tenantId: string;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const createMutation = useMutation({
        mutationFn: SiteService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sites', tenantId] });
            addToast({ type: 'success', title: 'Standort erstellt' });
            onClose();
        },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler', message: err.message });
        },
    });

    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Neuer Standort</h2>
                    <button onClick={onClose} className="btn-icon">
                        <X size={16} />
                    </button>
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        createMutation.mutate({
                            name: fd.get('name') as string,
                            address: (fd.get('address') as string) || undefined,
                            city: (fd.get('city') as string) || undefined,
                            country: (fd.get('country') as string) || undefined,
                            tenantId,
                        });
                    }}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
                            <input name="name" required placeholder="z.B. Hauptsitz Zürich" className="input" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Adresse</label>
                            <input name="address" placeholder="z.B. Musterstrasse 12" className="input" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Stadt</label>
                                <input name="city" placeholder="z.B. Zürich" className="input" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Land</label>
                                <input name="country" placeholder="z.B. CH" className="input" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Abbrechen
                        </button>
                        <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">
                            {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Create Room Modal ───────────────────────────────────────────────────────

function CreateRoomModal({
    site,
    onClose,
}: {
    site: Site;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const createMutation = useMutation({
        mutationFn: RoomService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms', site.id] });
            queryClient.invalidateQueries({ queryKey: ['sites', site.tenantId] });
            addToast({ type: 'success', title: 'Raum erstellt' });
            onClose();
        },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler', message: err.message });
        },
    });

    return (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Neuer Raum</h2>
                        <p className="text-xs text-slate-400 mt-0.5">in {site.name}</p>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <X size={16} />
                    </button>
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        createMutation.mutate({
                            name: fd.get('name') as string,
                            floor: (fd.get('floor') as string) || undefined,
                            description: (fd.get('description') as string) || undefined,
                            siteId: site.id,
                        });
                    }}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Name *</label>
                            <input name="name" required placeholder="z.B. Serverraum EG" className="input" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Etage</label>
                            <input name="floor" placeholder="z.B. EG, 1. OG, UG" className="input" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Beschreibung</label>
                            <input name="description" placeholder="Optionale Beschreibung" className="input" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Abbrechen
                        </button>
                        <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">
                            {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function SitesPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const [isCreateSiteOpen, setIsCreateSiteOpen] = useState(false);
    const [addRoomForSite, setAddRoomForSite] = useState<Site | null>(null);

    const { data: sites, isLoading, error } = useQuery({
        queryKey: ['sites', tenantId],
        queryFn: () => SiteService.getByTenant(tenantId!),
        enabled: !!tenantId,
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin h-6 w-6 text-primary-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-500 text-sm mb-2">Fehler beim Laden der Standorte</div>
                <p className="text-xs text-slate-400">{(error as Error).message}</p>
            </div>
        );
    }

    return (
        <div className="page">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title">Standorte & Räume</h1>
                    <p className="page-subtitle">Physische Standorte und Serverräume des Kunden</p>
                </div>
                <button onClick={() => setIsCreateSiteOpen(true)} className="btn-primary">
                    <Plus size={16} />
                    Neuer Standort
                </button>
            </div>

            {/* Sites list */}
            {sites?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center card">
                    <Building2 size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">Keine Standorte vorhanden</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-md">Erstelle den ersten Standort mit Räumen für die Infrastruktur. Standorte bilden die Basis für Racks und Geräte.</p>
                    <button onClick={() => setIsCreateSiteOpen(true)} className="btn-primary">
                        + Neuer Standort
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {sites?.map((site: Site) => (
                        <SiteCard
                            key={site.id}
                            site={site}
                            tenantId={tenantId!}
                            onAddRoom={setAddRoomForSite}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {isCreateSiteOpen && tenantId && (
                <CreateSiteModal tenantId={tenantId} onClose={() => setIsCreateSiteOpen(false)} />
            )}
            {addRoomForSite && (
                <CreateRoomModal site={addRoomForSite} onClose={() => setAddRoomForSite(null)} />
            )}
        </div>
    );
}
