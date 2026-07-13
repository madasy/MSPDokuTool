import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Globe, Network, Server, Lock, Building2 } from 'lucide-react';
import { ProviderService } from '../../services/ProviderService';

export default function ProvidedByMspPanel({ tenantId }: { tenantId: string }) {
    const { data } = useQuery({
        queryKey: ['provided-resources', tenantId],
        queryFn: () => ProviderService.getProvidedResources(tenantId),
    });

    if (!data) return null;
    const total = data.publicIps.length + data.vlans.length + data.subnets.length
        + data.devices.length + data.vpnTunnels.length;
    if (total === 0) return null;

    return (
        <div className="card overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-white/70 dark:border-white/10 flex items-center gap-2">
                <Building2 size={15} className="text-primary-500" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Vom MSP bereitgestellt</h2>
            </div>
            <div className="divide-y divide-white/70 dark:divide-white/10 text-sm">
                {data.publicIps.map(ip => (
                    <Row key={ip.id} icon={<Globe size={14} />}
                        label={<Link to="/datacenter" className="font-mono hover:text-primary-600">{ip.address}</Link>}
                        detail={`${ip.usage ?? 'Public IP'} · ${ip.subnetCidr}`} />
                ))}
                {data.vlans.map(v => (
                    <Row key={v.id} icon={<Network size={14} />}
                        label={<span>VLAN {v.vlanTag}{v.name ? ` – ${v.name}` : ''}</span>}
                        detail={`auf Infrastruktur von ${v.ownerTenantName}`} />
                ))}
                {data.subnets.map(s => (
                    <Row key={s.id} icon={<Network size={14} />}
                        label={<span className="font-mono">{s.cidr}</span>}
                        detail={s.description ?? `Subnetz von ${s.ownerTenantName}`} />
                ))}
                {data.devices.map(d => (
                    <Row key={d.id} icon={<Server size={14} />}
                        label={<span>{d.name}</span>}
                        detail={`${d.deviceType}${d.model ? ` · ${d.model}` : ''} · gehostet im MSP-Rack`} />
                ))}
                {data.vpnTunnels.map(t => (
                    <Row key={t.id} icon={<Lock size={14} />}
                        label={<span>{t.name}</span>}
                        detail={`${t.type.replace('_', ' ')} über ${t.localDeviceName} · ${t.status}`} />
                ))}
            </div>
        </div>
    );
}

function Row({ icon, label, detail }: { icon: React.ReactNode; label: React.ReactNode; detail: string }) {
    return (
        <div className="px-5 py-2.5 flex items-center gap-3">
            <span className="text-slate-400">{icon}</span>
            <div className="min-w-0">
                <div className="text-slate-800 dark:text-white">{label}</div>
                <div className="text-xs text-slate-500 truncate">{detail}</div>
            </div>
        </div>
    );
}
