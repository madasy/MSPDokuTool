import { type Subnet } from '../../services/NetworkService';
import { cn } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { NetworkService } from '../../services/NetworkService';
// For now, simple title attribute.

interface IpPlanVisualizationProps {
    subnet: Subnet;
}

export default function IpPlanVisualization({ subnet }: IpPlanVisualizationProps) {
    const { data: ips } = useQuery({
        queryKey: ['ips', subnet.id],
        queryFn: () => NetworkService.getIps(subnet.id),
    });

    // Simple visualization: Grid of blocks representing IPs.
    // Ideally we calculate the full range of IPs for the CIDR. 
    // Backend "totalIps" helps. 
    // Detailed calculation of every IP string to position requires a library like 'ip-address' or custom logic.
    // For MVP: Just list existing IPs and show a progress bar.

    return (
        <div className="card p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg text-slate-800">{subnet.cidr}</h3>
                <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-semibold",
                    subnet.utilizationPercent > 80 ? "bg-red-100 text-red-700" :
                        subnet.utilizationPercent > 50 ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                )}>
                    {subnet.utilizationPercent.toFixed(1)}% Used
                </span>
            </div>
            <p className="text-sm text-slate-500 mb-4">{subnet.description || "No description"}</p>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4">
                <div className="bg-primary-500 h-2.5 rounded-full" style={{ width: `${subnet.utilizationPercent}%` }}></div>
            </div>

            {/* IP List (Snippet) */}
            <div className="space-y-2">
                {ips && ips.length > 0 ? (
                    <table className="min-w-full text-sm">
                        <thead className="bg-white/70">
                            <tr>
                                <th className="text-left py-2 px-2">IP</th>
                                <th className="text-left py-2 px-2">Hostname</th>
                                <th className="text-left py-2 px-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ips.slice(0, 5).map(ip => (
                                <tr key={ip.id} className="border-b last:border-0 border-white/70">
                                    <td className="py-2 px-2 font-mono">{ip.address}</td>
                                    <td className="py-2 px-2">{ip.hostname || '-'}</td>
                                    <td className="py-2 px-2">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                                            ip.status === 'active' ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-800"
                                        )}>
                                            {ip.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center text-slate-400 text-xs py-2">No active IPs</div>
                )}
                {ips && ips.length > 5 && (
                    <div className="text-center text-xs text-primary-600 cursor-pointer pt-2">View all IPs</div>
                )}
            </div>
        </div>
    );
}
