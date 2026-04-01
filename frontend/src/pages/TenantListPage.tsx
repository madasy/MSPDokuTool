import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantService } from '../services/TenantService';
import { Plus, Loader2, Users, ArrowRight, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function TenantListPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: tenants, isLoading, error } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
    });

    const createMutation = useMutation({
        mutationFn: TenantService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tenants'] });
            setIsCreateModalOpen(false);
        },
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
                <div className="text-red-500 text-sm mb-2">Fehler beim Laden der Tenants</div>
                <p className="text-xs text-slate-400">{(error as Error).message}</p>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title">Tenants</h1>
                    <p className="page-subtitle">Alle Kunden-Dokumentationen</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="btn-primary"
                >
                    <Plus size={16} />
                    Neuer Tenant
                </button>
            </div>

            {/* Tenant Cards */}
            {tenants?.length === 0 ? (
                <div className="card p-12 text-center">
                    <Users size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 mb-4">Noch keine Tenants vorhanden.</p>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary"
                    >
                        Ersten Tenant erstellen
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tenants?.map(tenant => (
                        <Link
                            key={tenant.id}
                            to={`/tenants/${tenant.id}`}
                            className="card p-5 group hover:border-primary-200 transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-sm">
                                    {tenant.name.substring(0, 2).toUpperCase()}
                                </div>
                                <ArrowRight size={14} className="text-slate-300 group-hover:text-primary-500 transition-colors mt-1" />
                            </div>
                            <h3 className="font-semibold text-slate-800">{tenant.name}</h3>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{tenant.identifier}</p>
                            {tenant.createdAt && (
                                <p className="text-[11px] text-slate-400 mt-3">
                                    Erstellt: {new Date(tenant.createdAt).toLocaleDateString('de-DE')}
                                </p>
                            )}
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/60">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-800">Neuer Tenant</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="btn-icon">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            createMutation.mutate({
                                name: formData.get('name') as string,
                                identifier: formData.get('identifier') as string,
                            });
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                                    <input
                                        name="name"
                                        required
                                        placeholder="z.B. Kanzlei Müller"
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">Identifier (Slug)</label>
                                    <input
                                        name="identifier"
                                        required
                                        placeholder="z.B. kanzlei-mueller"
                                        className="input font-mono"
                                    />
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="btn-secondary"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="btn-primary disabled:opacity-50"
                                >
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
