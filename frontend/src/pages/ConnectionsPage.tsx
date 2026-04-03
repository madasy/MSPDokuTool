import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Trash2, Plus, ArrowRight, Loader2, X, Cable } from 'lucide-react';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { ConnectionService, type DeviceConnection, type DeviceInterface } from '../services/ConnectionService';
import { DeviceService } from '../services/DeviceService';

const CABLE_TYPES = [
    { value: 'copper', label: 'Kupfer (RJ45)' },
    { value: 'fiber', label: 'Glasfaser' },
    { value: 'patch', label: 'Patchkabel' },
];

export default function ConnectionsPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [showCreatePanel, setShowCreatePanel] = useState(false);

    // Connection list
    const { data: connections = [], isLoading } = useQuery({
        queryKey: ['connections', tenantId],
        queryFn: () => ConnectionService.getConnections(tenantId!),
        enabled: !!tenantId,
    });

    // All devices for dropdowns
    const { data: devices = [] } = useQuery({
        queryKey: ['devices', tenantId],
        queryFn: () => DeviceService.getAll(tenantId),
        enabled: !!tenantId,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => ConnectionService.deleteConnection(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections', tenantId] });
            addToast({ type: 'info', title: 'Gelöscht', message: 'Verbindung wurde entfernt.' });
        },
        onError: () => {
            addToast({ type: 'error', title: 'Fehler', message: 'Verbindung konnte nicht gelöscht werden.' });
        },
    });

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Link2 size={18} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        Verbindungen
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Physische Gerätekabel und Schnittstellen verwalten
                    </p>
                </div>
                <button
                    onClick={() => setShowCreatePanel(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus size={16} />
                    Neue Verbindung
                </button>
            </div>

            <div className="flex gap-6">
                {/* Left panel — connection list */}
                <div className="flex-1 min-w-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <Loader2 size={24} className="animate-spin mr-2" />
                            Verbindungen laden...
                        </div>
                    ) : connections.length === 0 ? (
                        <div className="card flex flex-col items-center justify-center py-16 text-center">
                            <Link2 size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">Keine Verbindungen dokumentiert</h3>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6 max-w-md">
                                Verbinde Geräte um die Netzwerktopologie zu erfassen. Jede Verbindung wird mit Interface und Kabeltyp dokumentiert.
                            </p>
                            <button
                                onClick={() => setShowCreatePanel(true)}
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                <Plus size={14} />
                                Neue Verbindung
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {connections.map((conn) => (
                                <ConnectionCard
                                    key={conn.id}
                                    connection={conn}
                                    onDelete={() => deleteMutation.mutate(conn.id)}
                                    isDeleting={deleteMutation.isPending}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Right panel — create connection */}
                {showCreatePanel && (
                    <div className="w-96 flex-shrink-0">
                        <CreateConnectionPanel
                            devices={devices}
                            onClose={() => setShowCreatePanel(false)}
                            onSuccess={() => {
                                queryClient.invalidateQueries({ queryKey: ['connections', tenantId] });
                                setShowCreatePanel(false);
                                addToast({ type: 'success', title: 'Verbunden', message: 'Verbindung wurde erstellt.' });
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/* --- Connection Card --- */

function ConnectionCard({ connection, onDelete, isDeleting }: {
    connection: DeviceConnection;
    onDelete: () => void;
    isDeleting: boolean;
}) {
    const { endpointA, endpointB, cableType, status } = connection;
    const cableLabel = CABLE_TYPES.find(c => c.value === cableType)?.label ?? cableType;

    return (
        <div className="card flex items-center gap-4">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Endpoint A */}
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Gerät A</p>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{endpointA.deviceName}</p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-mono">{endpointA.name}</p>
                    </div>

                    <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />

                    {/* Endpoint B */}
                    <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Gerät B</p>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{endpointB.deviceName}</p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-mono">{endpointB.name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                    {cableLabel && (
                        <span className="inline-flex items-center gap-1 text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                            <Cable size={10} />
                            {cableLabel}
                        </span>
                    )}
                    <span className={cn(
                        'inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium',
                        status === 'ACTIVE'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    )}>
                        {status === 'ACTIVE' ? 'Aktiv' : status}
                    </span>
                </div>
            </div>

            <button
                onClick={onDelete}
                disabled={isDeleting}
                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                title="Verbindung löschen"
            >
                <Trash2 size={15} />
            </button>
        </div>
    );
}

/* --- Create Connection Panel --- */

type Step = 1 | 2 | 3 | 4 | 5;

interface NewIface {
    name: string;
    type: string;
}

function CreateConnectionPanel({ devices, onClose, onSuccess }: {
    devices: any[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [step, setStep] = useState<Step>(1);
    const [deviceAId, setDeviceAId] = useState('');
    const [interfaceAId, setInterfaceAId] = useState('');
    const [deviceBId, setDeviceBId] = useState('');
    const [interfaceBId, setInterfaceBId] = useState('');
    const [cableType, setCableType] = useState('');
    const [newIfaceA, setNewIfaceA] = useState<NewIface>({ name: '', type: '' });
    const [newIfaceB, setNewIfaceB] = useState<NewIface>({ name: '', type: '' });
    const [showNewIfaceA, setShowNewIfaceA] = useState(false);
    const [showNewIfaceB, setShowNewIfaceB] = useState(false);
    const { addToast } = useToast();

    // Load interfaces for device A
    const { data: interfacesA = [], isLoading: loadingIfacesA, refetch: refetchIfacesA } = useQuery({
        queryKey: ['interfaces', deviceAId],
        queryFn: () => ConnectionService.getInterfaces(deviceAId),
        enabled: !!deviceAId,
    });

    // Load interfaces for device B
    const { data: interfacesB = [], isLoading: loadingIfacesB, refetch: refetchIfacesB } = useQuery({
        queryKey: ['interfaces', deviceBId],
        queryFn: () => ConnectionService.getInterfaces(deviceBId),
        enabled: !!deviceBId,
    });

    const createIfaceMutation = useMutation({
        mutationFn: ConnectionService.createInterface,
    });

    const createConnectionMutation = useMutation({
        mutationFn: ConnectionService.createConnection,
        onSuccess: () => onSuccess(),
        onError: () => addToast({ type: 'error', title: 'Fehler', message: 'Verbindung konnte nicht erstellt werden.' }),
    });

    const devicesB = devices.filter(d => d.id !== deviceAId);

    async function handleCreateIfaceA() {
        if (!newIfaceA.name) return;
        try {
            const iface = await createIfaceMutation.mutateAsync({
                deviceId: deviceAId,
                name: newIfaceA.name,
                type: newIfaceA.type || undefined,
            });
            await refetchIfacesA();
            setInterfaceAId(iface.id);
            setShowNewIfaceA(false);
            setNewIfaceA({ name: '', type: '' });
        } catch {
            addToast({ type: 'error', title: 'Fehler', message: 'Interface konnte nicht angelegt werden.' });
        }
    }

    async function handleCreateIfaceB() {
        if (!newIfaceB.name) return;
        try {
            const iface = await createIfaceMutation.mutateAsync({
                deviceId: deviceBId,
                name: newIfaceB.name,
                type: newIfaceB.type || undefined,
            });
            await refetchIfacesB();
            setInterfaceBId(iface.id);
            setShowNewIfaceB(false);
            setNewIfaceB({ name: '', type: '' });
        } catch {
            addToast({ type: 'error', title: 'Fehler', message: 'Interface konnte nicht angelegt werden.' });
        }
    }

    function handleConnect() {
        if (!interfaceAId || !interfaceBId) return;
        createConnectionMutation.mutate({
            endpointAId: interfaceAId,
            endpointBId: interfaceBId,
            cableType: cableType || undefined,
        });
    }

    const canProceedStep1 = !!deviceAId;
    const canProceedStep2 = !!interfaceAId;
    const canProceedStep3 = !!deviceBId;
    const canProceedStep4 = !!interfaceBId;

    return (
        <div className="card sticky top-4">
            {/* Panel header */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Link2 size={16} className="text-primary-500" />
                    Neue Verbindung
                </h2>
                <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                    <div key={s} className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        step >= s ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'
                    )} />
                ))}
            </div>

            {/* Step 1: Select Device A */}
            {step === 1 && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Schritt 1: Gerät A auswählen
                        </label>
                        <select
                            className="input w-full"
                            value={deviceAId}
                            onChange={e => { setDeviceAId(e.target.value); setInterfaceAId(''); }}
                        >
                            <option value="">-- Gerät wählen --</option>
                            {devices.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        className="btn-primary w-full"
                        disabled={!canProceedStep1}
                        onClick={() => setStep(2)}
                    >
                        Weiter
                    </button>
                </div>
            )}

            {/* Step 2: Select Interface A */}
            {step === 2 && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Schritt 2: Interface auf {devices.find(d => d.id === deviceAId)?.name}
                        </label>
                        {loadingIfacesA ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                                <Loader2 size={14} className="animate-spin" /> Lade Interfaces...
                            </div>
                        ) : (
                            <>
                                <select
                                    className="input w-full"
                                    value={interfaceAId}
                                    onChange={e => setInterfaceAId(e.target.value)}
                                >
                                    <option value="">-- Interface wählen --</option>
                                    {interfacesA.map((iface: DeviceInterface) => (
                                        <option key={iface.id} value={iface.id}>{iface.name}{iface.type ? ` (${iface.type})` : ''}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowNewIfaceA(!showNewIfaceA)}
                                    className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} />
                                    Neues Interface anlegen
                                </button>
                                {showNewIfaceA && (
                                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                                        <input
                                            className="input w-full"
                                            placeholder="Name (z.B. eth0, GE1)"
                                            value={newIfaceA.name}
                                            onChange={e => setNewIfaceA(p => ({ ...p, name: e.target.value }))}
                                        />
                                        <input
                                            className="input w-full"
                                            placeholder="Typ (z.B. RJ45, SFP)"
                                            value={newIfaceA.type}
                                            onChange={e => setNewIfaceA(p => ({ ...p, type: e.target.value }))}
                                        />
                                        <button
                                            className="btn-primary w-full text-xs py-1.5"
                                            onClick={handleCreateIfaceA}
                                            disabled={!newIfaceA.name || createIfaceMutation.isPending}
                                        >
                                            {createIfaceMutation.isPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Anlegen'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => setStep(1)}>
                            Zurück
                        </button>
                        <button
                            className="flex-1 btn-primary"
                            disabled={!canProceedStep2}
                            onClick={() => setStep(3)}
                        >
                            Weiter
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Select Device B */}
            {step === 3 && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Schritt 3: Gerät B auswählen
                        </label>
                        <select
                            className="input w-full"
                            value={deviceBId}
                            onChange={e => { setDeviceBId(e.target.value); setInterfaceBId(''); }}
                        >
                            <option value="">-- Gerät wählen --</option>
                            {devicesB.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => setStep(2)}>
                            Zurück
                        </button>
                        <button
                            className="flex-1 btn-primary"
                            disabled={!canProceedStep3}
                            onClick={() => setStep(4)}
                        >
                            Weiter
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Select Interface B */}
            {step === 4 && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Schritt 4: Interface auf {devices.find(d => d.id === deviceBId)?.name}
                        </label>
                        {loadingIfacesB ? (
                            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                                <Loader2 size={14} className="animate-spin" /> Lade Interfaces...
                            </div>
                        ) : (
                            <>
                                <select
                                    className="input w-full"
                                    value={interfaceBId}
                                    onChange={e => setInterfaceBId(e.target.value)}
                                >
                                    <option value="">-- Interface wählen --</option>
                                    {interfacesB.map((iface: DeviceInterface) => (
                                        <option key={iface.id} value={iface.id}>{iface.name}{iface.type ? ` (${iface.type})` : ''}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowNewIfaceB(!showNewIfaceB)}
                                    className="mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                                >
                                    <Plus size={12} />
                                    Neues Interface anlegen
                                </button>
                                {showNewIfaceB && (
                                    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2">
                                        <input
                                            className="input w-full"
                                            placeholder="Name (z.B. eth0, GE1)"
                                            value={newIfaceB.name}
                                            onChange={e => setNewIfaceB(p => ({ ...p, name: e.target.value }))}
                                        />
                                        <input
                                            className="input w-full"
                                            placeholder="Typ (z.B. RJ45, SFP)"
                                            value={newIfaceB.type}
                                            onChange={e => setNewIfaceB(p => ({ ...p, type: e.target.value }))}
                                        />
                                        <button
                                            className="btn-primary w-full text-xs py-1.5"
                                            onClick={handleCreateIfaceB}
                                            disabled={!newIfaceB.name || createIfaceMutation.isPending}
                                        >
                                            {createIfaceMutation.isPending ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Anlegen'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => setStep(3)}>
                            Zurück
                        </button>
                        <button
                            className="flex-1 btn-primary"
                            disabled={!canProceedStep4}
                            onClick={() => setStep(5)}
                        >
                            Weiter
                        </button>
                    </div>
                </div>
            )}

            {/* Step 5: Cable type + confirm */}
            {step === 5 && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Schritt 5: Kabeltyp (optional)
                        </label>
                        <select
                            className="input w-full"
                            value={cableType}
                            onChange={e => setCableType(e.target.value)}
                        >
                            <option value="">-- Kein Kabeltyp --</option>
                            {CABLE_TYPES.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Summary */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs space-y-1.5">
                        <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Zusammenfassung</p>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">A:</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{devices.find(d => d.id === deviceAId)?.name}</span>
                            <span className="text-primary-600 dark:text-primary-400 font-mono">{interfacesA.find((i: DeviceInterface) => i.id === interfaceAId)?.name}</span>
                        </div>
                        <ArrowRight size={12} className="text-slate-400 ml-4" />
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500">B:</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{devices.find(d => d.id === deviceBId)?.name}</span>
                            <span className="text-primary-600 dark:text-primary-400 font-mono">{interfacesB.find((i: DeviceInterface) => i.id === interfaceBId)?.name}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => setStep(4)}>
                            Zurück
                        </button>
                        <button
                            className="flex-1 btn-primary flex items-center justify-center gap-2"
                            onClick={handleConnect}
                            disabled={createConnectionMutation.isPending}
                        >
                            {createConnectionMutation.isPending ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Link2 size={14} />
                            )}
                            Verbinden
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
