import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Lock } from 'lucide-react';
import {
    VpnTunnelService,
    type CreateVpnTunnelRequest,
    type TunnelType,
    type IkeVersion,
    type EncryptionAlgorithm,
    type HashAlgorithm,
} from '../../services/VpnTunnelService';
import { DeviceService } from '../../services/DeviceService';
import { useToast } from '../ui/Toast';

const TYPE_LABELS: Record<TunnelType, string> = {
    IPSEC_S2S: 'IPsec Site-to-Site',
    SSL_VPN: 'SSL VPN',
    WIREGUARD: 'WireGuard',
    OTHER: 'Andere',
};

const STATUS_BADGES: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    DISABLED: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

export default function VpnTunnelSection({ tenantId }: { tenantId: string }) {
    const [showForm, setShowForm] = useState(false);
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const { data: tunnels } = useQuery({
        queryKey: ['vpn-tunnels', tenantId],
        queryFn: () => VpnTunnelService.getByTenant(tenantId),
    });

    const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: () => DeviceService.getAll() });
    const firewalls = (devices ?? []).filter(d => d.deviceType === 'FIREWALL');

    const createMutation = useMutation({
        mutationFn: (data: CreateVpnTunnelRequest) => VpnTunnelService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vpn-tunnels', tenantId] });
            setShowForm(false);
        },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler beim Erstellen', message: err.message });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => VpnTunnelService.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vpn-tunnels', tenantId] }),
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler beim Löschen', message: err.message });
        },
    });

    return (
        <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/70 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Lock size={15} className="text-slate-400" />
                    <h2 className="font-semibold text-slate-900 dark:text-white">VPN-Tunnel</h2>
                    <span className="text-xs text-slate-400">{tunnels?.length ?? 0}</span>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary text-xs px-3 py-1.5">
                    <Plus size={14} /> Tunnel
                </button>
            </div>

            {(tunnels ?? []).length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">Keine VPN-Tunnel dokumentiert.</div>
            ) : (
                <div className="divide-y divide-white/70 dark:divide-white/10">
                    {(tunnels ?? []).map(t => (
                        <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-slate-800 dark:text-white">{t.name}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[t.status]}`}>{t.status}</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    {TYPE_LABELS[t.type]} · {t.localDeviceName}
                                    {t.remoteDeviceName ? ` ↔ ${t.remoteDeviceName}` : ''}
                                    {t.ikeVersion ? ` · ${t.ikeVersion}` : ''}
                                    {t.encryption ? ` / ${t.encryption.replace('_', '-')}` : ''}
                                    {t.secretRef ? ` · PSK: ${t.secretRef}` : ''}
                                </div>
                            </div>
                            <button onClick={() => deleteMutation.mutate(t.id)} className="btn-icon text-slate-400 hover:text-red-500">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <div className="modal-overlay" onClick={() => setShowForm(false)}>
                    <div className="modal-content max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Neuer VPN-Tunnel</h2>
                            <button onClick={() => setShowForm(false)} className="btn-icon"><X size={16} /></button>
                        </div>
                        <form onSubmit={e => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            createMutation.mutate({
                                name: fd.get('name') as string,
                                type: fd.get('type') as TunnelType,
                                tenantId,
                                localDeviceId: fd.get('localDeviceId') as string,
                                ikeVersion: (fd.get('ikeVersion') as IkeVersion) || undefined,
                                encryption: (fd.get('encryption') as EncryptionAlgorithm) || undefined,
                                hash: (fd.get('hash') as HashAlgorithm) || undefined,
                                dhGroup: fd.get('dhGroup') ? Number(fd.get('dhGroup')) : undefined,
                                secretRef: (fd.get('secretRef') as string) || undefined,
                            });
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Name</label>
                                    <input name="name" required placeholder="z.B. S2S Kunde HQ" className="input" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Typ</label>
                                    <select name="type" className="input" defaultValue="IPSEC_S2S">
                                        {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Lokales Gerät (MSP-Seite)</label>
                                    <select name="localDeviceId" required className="input">
                                        <option value="">— wählen —</option>
                                        {firewalls.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <details className="rounded-xl border border-slate-200 dark:border-white/10 p-3">
                                    <summary className="text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">Erweitert (IKE / Krypto / PSK-Referenz)</summary>
                                    <div className="space-y-3 mt-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <select name="ikeVersion" className="input" defaultValue="">
                                                <option value="">IKE-Version</option>
                                                <option value="IKEV1">IKEv1</option>
                                                <option value="IKEV2">IKEv2</option>
                                            </select>
                                            <select name="encryption" className="input" defaultValue="">
                                                <option value="">Verschlüsselung</option>
                                                <option value="AES_128">AES-128</option>
                                                <option value="AES_256">AES-256</option>
                                                <option value="TRIPLE_DES">3DES</option>
                                                <option value="CHACHA20">ChaCha20</option>
                                            </select>
                                            <select name="hash" className="input" defaultValue="">
                                                <option value="">Hash</option>
                                                <option value="SHA1">SHA-1</option>
                                                <option value="SHA256">SHA-256</option>
                                                <option value="SHA512">SHA-512</option>
                                            </select>
                                            <input name="dhGroup" type="number" min="1" max="32" placeholder="DH-Gruppe" className="input" />
                                        </div>
                                        <input name="secretRef" placeholder="Bitwarden-Eintrag (kein Secret!)" className="input" />
                                    </div>
                                </details>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Abbrechen</button>
                                <button type="submit" disabled={createMutation.isPending} className="btn-primary disabled:opacity-50">
                                    {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
