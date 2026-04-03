import { type ReactNode } from 'react';

interface FieldGroupProps {
    level: 'required' | 'recommended' | 'advanced';
    show: boolean;
    children: ReactNode;
}

export function FieldGroup({ level, show, children }: FieldGroupProps) {
    if (level === 'advanced' && !show) return null;
    return <>{children}</>;
}

export function AdvancedToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors mt-4 cursor-pointer"
        >
            <div className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${
                show ? 'bg-primary-600 border-primary-500' : 'border-slate-600 bg-transparent'
            }`}>
                {show && <span className="text-white text-[10px]">✓</span>}
            </div>
            Erweiterte Felder anzeigen
        </button>
    );
}
