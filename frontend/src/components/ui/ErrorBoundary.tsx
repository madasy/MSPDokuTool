import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
                    <div className="p-4 rounded-2xl bg-red-50 text-red-500 mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-800 mb-1">Etwas ist schiefgelaufen</h2>
                    <p className="text-sm text-slate-500 max-w-md mb-4">
                        Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
                    </p>
                    {this.state.error && (
                        <pre className="text-xs text-red-400 bg-red-50/50 rounded-lg p-3 mb-4 max-w-lg overflow-auto">
                            {this.state.error.message}
                        </pre>
                    )}
                    <button onClick={this.handleReset} className="btn-primary">
                        <RefreshCw size={14} />
                        Erneut versuchen
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
