import { useState } from 'react';
import { X, Plus, Server, HardDrive, Cpu, Monitor, Wifi, Shield, Box } from 'lucide-react';
import { useToast } from '../ui/Toast';

/* ─── Create Rack Modal ─── */

interface CreateRackModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
}

export function CreateRackModal({ isOpen, onClose, tenantId: _tenantId }: CreateRackModalProps) {
    const { addToast } = useToast();

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = fd.get('name') as string;
        // TODO: API call to create rack
        addToast({ type: 'success', title: 'Rack erstellt', message: `"${name}" wurde hinzugefügt.` });
        onClose();
    };

    return (
        <div className="modal-overlay animate-fade-in">
            <div className="modal-content max-w-lg">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-800">Neues Rack</h2>
                    <button onClick={onClose} className="btn-icon"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Rack-Name</label>
                            <input name="name" required placeholder="z.B. Rack-A01" className="input" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Standort</label>
                                <select name="site" className="input">
                                    <option>Datacenter Zürich</option>
                                    <option>Datacenter Bern</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Raum</label>
                                <input name="room" placeholder="z.B. Serverraum 1" className="input" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Höheneinheiten (HE)</label>
                                <input name="totalUnits" type="number" defaultValue={42} min={1} max={52} className="input" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Max. Leistung (kW)</label>
                                <input name="maxPower" type="number" defaultValue={10} step={0.5} className="input" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Beschreibung</label>
                            <textarea name="description" rows={2} placeholder="Optionale Notizen..." className="input" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
                        <button type="submit" className="btn-primary"><Plus size={14} /> Erstellen</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Create Device Modal ─── */

const DEVICE_TYPES = [
    { value: 'SERVER', label: 'Server', icon: <Server size={16} /> },
    { value: 'SWITCH', label: 'Switch', icon: <HardDrive size={16} /> },
    { value: 'FIREWALL', label: 'Firewall', icon: <Shield size={16} /> },
    { value: 'ROUTER', label: 'Router', icon: <Cpu size={16} /> },
    { value: 'STORAGE', label: 'Storage (NAS/SAN)', icon: <HardDrive size={16} /> },
    { value: 'WIFI_AP', label: 'WiFi Access Point', icon: <Wifi size={16} /> },
    { value: 'MONITOR', label: 'Monitor/KVM', icon: <Monitor size={16} /> },
    { value: 'OTHER', label: 'Sonstiges', icon: <Box size={16} /> },
];

interface CreateDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
    rackId?: string;
}

export function CreateDeviceModal({ isOpen, onClose, tenantId: _tenantId, rackId }: CreateDeviceModalProps) {
    const { addToast } = useToast();
    const [deviceType, setDeviceType] = useState('SERVER');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = fd.get('name') as string;
        // TODO: API call to create device
        addToast({ type: 'success', title: 'Gerät hinzugefügt', message: `"${name}" wurde erstellt.` });
        onClose();
    };

    return (
        <div className="modal-overlay animate-fade-in">
            <div className="modal-content max-w-xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-800">Neues Gerät</h2>
                    <button onClick={onClose} className="btn-icon"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Device Type Selector */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-2">Gerätetyp</label>
                            <div className="grid grid-cols-4 gap-2">
                                {DEVICE_TYPES.map(dt => (
                                    <button
                                        key={dt.value}
                                        type="button"
                                        onClick={() => setDeviceType(dt.value)}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-all ${deviceType === dt.value
                                            ? 'border-primary-400 bg-primary-50 text-primary-700'
                                            : 'border-transparent bg-slate-50 text-slate-500 hover:border-slate-200'
                                            }`}
                                    >
                                        {dt.icon}
                                        {dt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Gerätename</label>
                                <input name="name" required placeholder="z.B. ESXi-Host-01" className="input" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Hersteller & Modell</label>
                                <input name="model" placeholder="z.B. Dell R740xd" className="input" />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">IP-Adresse</label>
                                <input name="ip" placeholder="10.0.0.x" className="input font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Seriennummer</label>
                                <input name="serial" placeholder="SN-XXXX" className="input font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Höheneinheiten</label>
                                <input name="heightU" type="number" defaultValue={1} min={1} max={42} className="input" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                                <select name="status" className="input">
                                    <option value="ACTIVE">Aktiv</option>
                                    <option value="PLANNED">Geplant</option>
                                    <option value="DECOMMISSIONED">Außer Betrieb</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Rack (optional)</label>
                                <select name="rack" className="input" defaultValue={rackId ?? ''}>
                                    <option value="">Nicht platziert</option>
                                    <option value="rack-a01">Rack-A01</option>
                                    <option value="rack-a02">Rack-A02</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Notizen</label>
                            <textarea name="notes" rows={2} placeholder="Firmware-Version, Uplink-Info, etc." className="input" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
                        <button type="submit" className="btn-primary"><Plus size={14} /> Gerät erstellen</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Create Subnet Modal ─── */

interface CreateSubnetModalProps {
    isOpen: boolean;
    onClose: () => void;
    tenantId: string;
}

export function CreateSubnetModal({ isOpen, onClose, tenantId: _tenantId }: CreateSubnetModalProps) {
    const { addToast } = useToast();

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const cidr = fd.get('cidr') as string;
        // TODO: API call to create subnet
        addToast({ type: 'success', title: 'Subnetz erstellt', message: `${cidr} wurde angelegt.` });
        onClose();
    };

    return (
        <div className="modal-overlay animate-fade-in">
            <div className="modal-content max-w-lg">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-800">Neues Subnetz</h2>
                    <button onClick={onClose} className="btn-icon"><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CIDR</label>
                                <input name="cidr" required placeholder="z.B. 10.0.1.0/24" className="input font-mono" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">VLAN ID</label>
                                <input name="vlanId" type="number" placeholder="z.B. 10" className="input" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">VLAN Name</label>
                                <input name="vlanName" placeholder="z.B. Management" className="input" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Gateway</label>
                                <input name="gateway" placeholder="z.B. 10.0.1.1" className="input font-mono" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Beschreibung</label>
                            <input name="description" placeholder="z.B. Server-Netzwerk Kanzlei Müller" className="input" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">DNS Server</label>
                            <input name="dns" placeholder="z.B. 8.8.8.8, 8.8.4.4" className="input font-mono" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
                        <button type="submit" className="btn-primary"><Plus size={14} /> Subnetz erstellen</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
