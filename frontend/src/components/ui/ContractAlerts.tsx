import { AlertTriangle, Clock, X } from 'lucide-react';
import { useState } from 'react';

interface ContractAlert {
    id: string;
    tenantName: string;
    contractType: string;
    expiresAt: string;
    daysLeft: number;
}

// Mock data — will be replaced with API calls
const MOCK_ALERTS: ContractAlert[] = [
    { id: '1', tenantName: 'Kanzlei Müller', contractType: 'Hosting-Vertrag', expiresAt: '2026-03-15', daysLeft: 32 },
    { id: '2', tenantName: 'Acme GmbH', contractType: 'SSL-Zertifikat Wildcard', expiresAt: '2026-02-28', daysLeft: 17 },
    { id: '3', tenantName: 'Praxis Weber', contractType: 'Microsoft 365 Lizenz', expiresAt: '2026-02-20', daysLeft: 9 },
];

export default function ContractAlerts() {
    const [dismissed, setDismissed] = useState<string[]>([]);

    const visibleAlerts = MOCK_ALERTS.filter(a => !dismissed.includes(a.id));
    if (visibleAlerts.length === 0) return null;

    return (
        <div className="space-y-2 mb-6">
            {visibleAlerts.map(alert => {
                const isUrgent = alert.daysLeft <= 14;
                return (
                    <div
                        key={alert.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${isUrgent
                                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                                : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
                            }`}
                    >
                        {isUrgent ? <AlertTriangle size={16} className="flex-shrink-0" /> : <Clock size={16} className="flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                            <span className="font-semibold">{alert.tenantName}</span>
                            <span className="mx-1.5 opacity-40">·</span>
                            <span>{alert.contractType}</span>
                            <span className="mx-1.5 opacity-40">·</span>
                            <span className="font-medium">
                                {isUrgent ? `Läuft in ${alert.daysLeft} Tagen ab!` : `Noch ${alert.daysLeft} Tage`}
                            </span>
                        </div>
                        <button
                            onClick={() => setDismissed(prev => [...prev, alert.id])}
                            className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                            <X size={14} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
