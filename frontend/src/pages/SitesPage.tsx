import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Loader2, ChevronDown, ChevronRight, MapPin, DoorOpen, X, Layers } from 'lucide-react';
import { SiteService, RoomService } from '../services/SiteService';
import type { Site, Room } from '../services/SiteService';
import { useToast } from '../components/ui/Toast';

// ── Expanded site card with rooms ──────────────────────────────────────────

function SiteCard({
    site,
    onAddRoom,
}: {
    site: Site;
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
                                <RoomRow key={room.id} room={room} />
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

function RoomRow({ room }: { room: Room }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 flex items-center justify-center flex-shrink-0">
                <DoorOpen size={14} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{room.name}</p>
                {room.floor && (
                    <p className="text-xs text-slate-400">Etage: {room.floor}</p>
                )}
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                <Layers size={10} />
                {room.rackCount} {room.rackCount === 1 ? 'Rack' : 'Racks'}
            </span>
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
                <div className="card p-12 text-center">
                    <Building2 size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 mb-4">Noch keine Standorte vorhanden.</p>
                    <button onClick={() => setIsCreateSiteOpen(true)} className="btn-primary">
                        Ersten Standort erstellen
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {sites?.map((site: Site) => (
                        <SiteCard
                            key={site.id}
                            site={site}
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
