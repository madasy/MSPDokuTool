import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextValue {
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { ...toast, id }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    info: <Info size={18} />,
};

const COLORS: Record<ToastType, string> = {
    success: 'text-green-600 bg-green-50 border-green-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        const duration = toast.duration ?? 4000;
        const timer = setTimeout(() => setIsLeaving(true), duration);
        return () => clearTimeout(timer);
    }, [toast.duration]);

    useEffect(() => {
        if (isLeaving) {
            const timer = setTimeout(onDismiss, 300);
            return () => clearTimeout(timer);
        }
    }, [isLeaving, onDismiss]);

    return (
        <div
            className={cn(
                'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm min-w-[320px] max-w-[420px] transition-all duration-300',
                COLORS[toast.type],
                isLeaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-slide-in'
            )}
        >
            <span className="mt-0.5 flex-shrink-0">{ICONS[toast.type]}</span>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.message && <p className="text-xs opacity-80 mt-0.5">{toast.message}</p>}
            </div>
            <button onClick={() => setIsLeaving(true)} className="mt-0.5 opacity-50 hover:opacity-100 transition-opacity flex-shrink-0">
                <X size={14} />
            </button>
        </div>
    );
}
