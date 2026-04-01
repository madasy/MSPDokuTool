import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Loader2, X, ShieldCheck, User } from 'lucide-react';
import { UserService, type AutheliaUser, type CreateUserRequest } from '../services/UserService';
import { TenantService } from '../services/TenantService';
import { useToast } from '../components/ui/Toast';

export default function UserManagementPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
    });

    const currentTenant = tenants?.find(t => t.id === tenantId);
    const tenantIdentifier = currentTenant?.identifier ?? '';

    const { data: users, isLoading, error } = useQuery({
        queryKey: ['users', tenantId],
        queryFn: () => UserService.getAll(),
        enabled: !!tenantId,
    });

    const deleteMutation = useMutation({
        mutationFn: (username: string) => UserService.delete(username),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
            addToast({ type: 'success', title: 'Benutzer gelöscht' });
        },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler beim Löschen', message: err.message });
        },
    });

    const isTechnician = (user: AutheliaUser) =>
        user.groups.includes('technicians') || user.groups.includes('admins');

    const isTenantUser = (user: AutheliaUser) =>
        user.groups.includes(`tenant:${tenantIdentifier}`);

    const technicians = (users ?? []).filter(isTechnician);
    const tenantUsers = (users ?? []).filter(u => isTenantUser(u) && !isTechnician(u));

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
                <div className="text-red-500 text-sm mb-2">Fehler beim Laden der Benutzer</div>
                <p className="text-xs text-slate-400">{(error as Error).message}</p>
            </div>
        );
    }

    return (
        <div className="page">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title">Benutzer</h1>
                    {currentTenant && (
                        <p className="page-subtitle">{currentTenant.name}</p>
                    )}
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="btn-primary"
                    disabled={!tenantIdentifier}
                >
                    <UserPlus size={16} className="mr-2" />
                    Neuer Benutzer
                </button>
            </div>

            {/* Techniker section */}
            <div className="card mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck size={18} className="text-primary-400" />
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Techniker</h2>
                    <span className="badge">{technicians.length}</span>
                    <span className="ml-auto text-xs text-slate-400">Verwaltet via Authelia-Konfiguration</span>
                </div>
                {technicians.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">Keine Techniker gefunden.</p>
                ) : (
                    <UserTable users={technicians} readOnly />
                )}
            </div>

            {/* Kunden-Benutzer section */}
            <div className="card">
                <div className="flex items-center gap-2 mb-4">
                    <User size={18} className="text-primary-400" />
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Kunden-Benutzer</h2>
                    <span className="badge">{tenantUsers.length}</span>
                </div>
                {tenantUsers.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">Keine Kunden-Benutzer vorhanden. Erstelle den ersten mit "Neuer Benutzer".</p>
                ) : (
                    <UserTable
                        users={tenantUsers}
                        onDelete={(username) => deleteMutation.mutate(username)}
                        deletingUsername={deleteMutation.isPending ? (deleteMutation.variables as string) : undefined}
                    />
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && tenantIdentifier && (
                <CreateUserModal
                    tenantIdentifier={tenantIdentifier}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={() => {
                        queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
                        setIsCreateModalOpen(false);
                        addToast({ type: 'success', title: 'Benutzer erstellt' });
                    }}
                    onError={(msg) => addToast({ type: 'error', title: 'Fehler beim Erstellen', message: msg })}
                />
            )}
        </div>
    );
}

/* --- UserTable --- */

function UserTable({
    users,
    readOnly = false,
    onDelete,
    deletingUsername,
}: {
    users: AutheliaUser[];
    readOnly?: boolean;
    onDelete?: (username: string) => void;
    deletingUsername?: string;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Username</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Name</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">E-Mail</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Gruppen</th>
                        {!readOnly && <th className="py-2 px-3" />}
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.username} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                            <td className="py-2.5 px-3 font-mono text-xs text-slate-700 dark:text-slate-300">{user.username}</td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{user.displayname || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{user.email || '—'}</td>
                            <td className="py-2.5 px-3">
                                <div className="flex flex-wrap gap-1">
                                    {user.groups.map(g => (
                                        <span key={g} className="badge">{g}</span>
                                    ))}
                                </div>
                            </td>
                            {!readOnly && (
                                <td className="py-2.5 px-3 text-right">
                                    <button
                                        onClick={() => onDelete?.(user.username)}
                                        disabled={deletingUsername === user.username}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                        title="Benutzer löschen"
                                    >
                                        {deletingUsername === user.username
                                            ? <Loader2 size={14} className="animate-spin" />
                                            : <Trash2 size={14} />}
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* --- CreateUserModal --- */

function CreateUserModal({
    tenantIdentifier,
    onClose,
    onCreated,
    onError,
}: {
    tenantIdentifier: string;
    onClose: () => void;
    onCreated: () => void;
    onError: (msg: string) => void;
}) {
    const [form, setForm] = useState<CreateUserRequest>({
        username: '',
        displayname: '',
        email: '',
        password: '',
        groups: [`tenant:${tenantIdentifier}`],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEmailChange = (email: string) => {
        const prefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '');
        setForm(prev => ({
            ...prev,
            email,
            username: prev.username === '' || prev.username === form.email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '')
                ? prefix
                : prev.username,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password.length < 8) {
            onError('Passwort muss mindestens 8 Zeichen lang sein.');
            return;
        }
        setIsSubmitting(true);
        try {
            await UserService.create(form);
            onCreated();
        } catch (err) {
            onError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Neuer Benutzer</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            E-Mail <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="email"
                            required
                            className="input w-full"
                            value={form.email}
                            onChange={e => handleEmailChange(e.target.value)}
                            placeholder="benutzer@kunde.ch"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Username <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            className="input w-full font-mono"
                            value={form.username}
                            onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="benutzername"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Anzeigename
                        </label>
                        <input
                            type="text"
                            className="input w-full"
                            value={form.displayname}
                            onChange={e => setForm(prev => ({ ...prev, displayname: e.target.value }))}
                            placeholder="Max Mustermann"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Passwort <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            className="input w-full"
                            value={form.password}
                            onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Mindestens 8 Zeichen"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Gruppe (automatisch)
                        </label>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {form.groups.map(g => (
                                <span key={g} className="badge">{g}</span>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn-primary"
                        >
                            {isSubmitting ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                            Erstellen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
