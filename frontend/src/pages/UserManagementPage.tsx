import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Loader2, X, KeyRound, ShieldOff } from 'lucide-react';
import { UserService, type UserInfo, type CreateUserRequest } from '../services/UserService';
import { TenantService } from '../services/TenantService';
import { useToast } from '../components/ui/Toast';

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Admin',
    TECHNICIAN: 'Techniker',
    TENANT_USER: 'Kunden-Benutzer',
};

const ROLE_BADGE_CLASS: Record<string, string> = {
    ADMIN: 'bg-red-500/10 text-red-400 border border-red-500/20',
    TECHNICIAN: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    TENANT_USER: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

export default function UserManagementPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [resetPasswordUser, setResetPasswordUser] = useState<string | null>(null);

    const { data: tenants } = useQuery({
        queryKey: ['tenants'],
        queryFn: TenantService.getAll,
    });

    const currentTenant = tenants?.find(t => t.id === tenantId);

    const { data: users, isLoading, error } = useQuery({
        queryKey: ['users'],
        queryFn: () => UserService.getAll(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => UserService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            addToast({ type: 'success', title: 'Benutzer gelöscht' });
        },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler beim Löschen', message: err.message });
        },
    });

    const resetTotpMutation = useMutation({
        mutationFn: (id: string) => UserService.resetTotp(id),
        onSuccess: () => {
            addToast({ type: 'success', title: '2FA zurückgesetzt', message: 'Der Benutzer muss sich beim nächsten Login neu registrieren.' });
        },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler beim 2FA-Reset', message: err.message });
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
                >
                    <UserPlus size={16} className="mr-2" />
                    Neuer Benutzer
                </button>
            </div>

            {/* Users table */}
            <div className="card">
                {(!users || users.length === 0) ? (
                    <p className="text-xs text-slate-400 py-2">Keine Benutzer vorhanden.</p>
                ) : (
                    <UserTable
                        users={users}
                        onDelete={(id) => {
                            if (confirm('Benutzer wirklich löschen?')) deleteMutation.mutate(id);
                        }}
                        onResetPassword={(id) => setResetPasswordUser(id)}
                        onResetTotp={(id) => {
                            if (confirm('2FA für diesen Benutzer wirklich zurücksetzen?')) {
                                resetTotpMutation.mutate(id);
                            }
                        }}
                        deletingId={deleteMutation.isPending ? (deleteMutation.variables as string) : undefined}
                    />
                )}
            </div>

            {/* Reset Password Modal */}
            {resetPasswordUser && (
                <ResetPasswordModal
                    userId={resetPasswordUser}
                    onClose={() => setResetPasswordUser(null)}
                    onSuccess={() => {
                        setResetPasswordUser(null);
                        addToast({ type: 'success', title: 'Passwort zurückgesetzt' });
                    }}
                    onError={(msg) => addToast({ type: 'error', title: 'Fehler', message: msg })}
                />
            )}

            {/* Create Modal */}
            {isCreateModalOpen && (
                <CreateUserModal
                    tenants={tenants || []}
                    defaultTenantId={tenantId}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreated={() => {
                        queryClient.invalidateQueries({ queryKey: ['users'] });
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
    onDelete,
    onResetPassword,
    onResetTotp,
    deletingId,
}: {
    users: UserInfo[];
    onDelete?: (id: string) => void;
    onResetPassword?: (id: string) => void;
    onResetTotp?: (id: string) => void;
    deletingId?: string;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">E-Mail</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Anzeigename</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Rolle</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Tenant</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400">2FA</th>
                        <th className="py-2 px-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Aktionen</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{user.email}</td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{user.displayName || '—'}</td>
                            <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${ROLE_BADGE_CLASS[user.role] || ROLE_BADGE_CLASS['TENANT_USER']}`}>
                                    {ROLE_LABELS[user.role] || user.role}
                                </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-xs">{user.tenantName || '—'}</td>
                            <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${user.totpEnabled ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                                    {user.totpEnabled ? 'Aktiv' : 'Inaktiv'}
                                </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button
                                        onClick={() => onResetPassword?.(user.id)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                        title="Passwort zurücksetzen"
                                    >
                                        <KeyRound size={14} />
                                    </button>
                                    <button
                                        onClick={() => onResetTotp?.(user.id)}
                                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                        title="2FA zurücksetzen"
                                    >
                                        <ShieldOff size={14} />
                                    </button>
                                    <button
                                        onClick={() => onDelete?.(user.id)}
                                        disabled={deletingId === user.id}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                        title="Benutzer löschen"
                                    >
                                        {deletingId === user.id
                                            ? <Loader2 size={14} className="animate-spin" />
                                            : <Trash2 size={14} />}
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* --- CreateUserModal --- */

function CreateUserModal({
    tenants,
    defaultTenantId,
    onClose,
    onCreated,
    onError,
}: {
    tenants: any[];
    defaultTenantId?: string;
    onClose: () => void;
    onCreated: () => void;
    onError: (msg: string) => void;
}) {
    const [form, setForm] = useState<CreateUserRequest>({
        email: '',
        displayName: '',
        password: '',
        role: 'TENANT_USER',
        tenantId: defaultTenantId || '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="benutzer@beispiel.ch"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Anzeigename
                        </label>
                        <input
                            type="text"
                            className="input w-full"
                            value={form.displayName || ''}
                            onChange={e => setForm(prev => ({ ...prev, displayName: e.target.value }))}
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
                            Rolle <span className="text-red-400">*</span>
                        </label>
                        <select
                            className="input w-full"
                            value={form.role}
                            onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                        >
                            <option value="TENANT_USER">Kunden-Benutzer</option>
                            <option value="TECHNICIAN">Techniker</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Tenant (optional)
                        </label>
                        <select
                            className="input w-full"
                            value={form.tenantId || ''}
                            onChange={e => setForm(prev => ({ ...prev, tenantId: e.target.value || undefined }))}
                        >
                            <option value="">— Kein Tenant —</option>
                            {tenants.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
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

/* --- ResetPasswordModal --- */

function ResetPasswordModal({
    userId,
    onClose,
    onSuccess,
    onError,
}: {
    userId: string;
    onClose: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            onError('Passwort muss mindestens 8 Zeichen lang sein.');
            return;
        }
        if (password !== confirm) {
            onError('Passwörter stimmen nicht überein.');
            return;
        }
        setIsSubmitting(true);
        try {
            await UserService.resetPassword(userId, password);
            onSuccess();
        } catch (err) {
            onError((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        Passwort zurücksetzen
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Neues Passwort
                        </label>
                        <input
                            type="password"
                            required
                            minLength={8}
                            className="input w-full"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Mindestens 8 Zeichen"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Passwort bestätigen
                        </label>
                        <input
                            type="password"
                            required
                            className="input w-full"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            placeholder="Passwort wiederholen"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs">
                            Abbrechen
                        </button>
                        <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Zurücksetzen'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
