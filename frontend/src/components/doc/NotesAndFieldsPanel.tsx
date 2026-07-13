import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Plus, Trash2, X, FileText, Tag } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { EntityDocService, type DocEntityType, type FieldType } from '../../services/EntityDocService';

interface Props {
    entityType: DocEntityType;
    entityId: string;
}

// No prose/typography plugin is configured, so markdown elements get manual classes.
const markdownComponents: Components = {
    h1: ({ children }) => <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-3 mb-1.5 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="text-base font-bold text-slate-900 dark:text-white mt-3 mb-1.5 first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2 mb-1 first:mt-0">{children}</h3>,
    p: ({ children }) => <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{children}</p>,
    ul: ({ children }) => <ul className="list-disc list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-slate-700 dark:text-slate-300 space-y-1">{children}</ol>,
    li: ({ children }) => <li>{children}</li>,
    a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{children}</a>,
    code: ({ children }) => <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono">{children}</code>,
    pre: ({ children }) => <pre className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-mono overflow-x-auto">{children}</pre>,
    blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-300 dark:border-slate-600 pl-3 italic text-slate-600 dark:text-slate-400">{children}</blockquote>,
    strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
};

export default function NotesAndFieldsPanel({ entityType, entityId }: Props) {
    const [showNoteForm, setShowNoteForm] = useState(false);
    const [showFieldForm, setShowFieldForm] = useState(false);
    const queryClient = useQueryClient();
    const { addToast } = useToast();

    const notesQuery = useQuery({
        queryKey: ['notes', entityType, entityId],
        queryFn: () => EntityDocService.getNotes(entityType, entityId),
    });
    const fieldsQuery = useQuery({
        queryKey: ['custom-fields', entityType, entityId],
        queryFn: () => EntityDocService.getCustomFields(entityType, entityId),
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['notes', entityType, entityId] });
        queryClient.invalidateQueries({ queryKey: ['custom-fields', entityType, entityId] });
    };

    const createNote = useMutation({
        mutationFn: (data: { title: string; contentMarkdown: string }) =>
            EntityDocService.createNote({ ...data, entityType, entityId }),
        onSuccess: () => { invalidate(); setShowNoteForm(false); },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler', message: err.message });
        },
    });
    const deleteNote = useMutation({
        mutationFn: EntityDocService.deleteNote,
        onSuccess: invalidate,
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler', message: err.message });
        },
    });
    const createField = useMutation({
        mutationFn: (data: { name: string; value: string; fieldType: FieldType }) =>
            EntityDocService.createCustomField({ ...data, entityType, entityId }),
        onSuccess: () => { invalidate(); setShowFieldForm(false); },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler', message: err.message });
        },
    });
    const deleteField = useMutation({
        mutationFn: EntityDocService.deleteCustomField,
        onSuccess: invalidate,
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler', message: err.message });
        },
    });

    const notes = notesQuery.data ?? [];
    const fields = fieldsQuery.data ?? [];

    return (
        <div className="card overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-white/70 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText size={15} className="text-slate-400" />
                    <h2 className="font-semibold text-slate-900 dark:text-white">Notizen & Felder</h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowFieldForm(true)} className="btn-secondary text-xs px-3 py-1.5">
                        <Tag size={13} /> Feld
                    </button>
                    <button onClick={() => setShowNoteForm(true)} className="btn-primary text-xs px-3 py-1.5">
                        <Plus size={14} /> Notiz
                    </button>
                </div>
            </div>

            {/* Custom fields */}
            {fields.length > 0 && (
                <div className="px-5 py-3 border-b border-white/70 dark:border-white/10 flex flex-wrap gap-2">
                    {fields.map(f => (
                        <span key={f.id} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700/60 rounded-full px-3 py-1">
                            <b className="text-slate-700 dark:text-slate-200">{f.name}:</b>
                            {f.fieldType === 'URL' && /^https?:\/\//i.test(f.value)
                                ? <a href={f.value} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{f.value}</a>
                                : <span className="text-slate-600 dark:text-slate-300">{f.value}</span>}
                            <button onClick={() => deleteField.mutate(f.id)} className="text-slate-400 hover:text-red-500"><X size={11} /></button>
                        </span>
                    ))}
                </div>
            )}

            {/* Notes */}
            {notes.length === 0 && fields.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                    Noch keine Notizen oder Felder – frei ergänzbar wie in Confluence.
                </div>
            ) : (
                <div className="divide-y divide-white/70 dark:divide-white/10">
                    {notes.map(note => (
                        <details key={note.id} className="group">
                            <summary className="px-5 py-3 cursor-pointer flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-800 dark:text-white">{note.title}</span>
                                <button
                                    onClick={e => { e.preventDefault(); deleteNote.mutate(note.id); }}
                                    className="btn-icon text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </summary>
                            <div className="px-5 pb-4 text-sm text-slate-700 dark:text-slate-300 space-y-2">
                                <ReactMarkdown components={markdownComponents}>{note.contentMarkdown}</ReactMarkdown>
                            </div>
                        </details>
                    ))}
                </div>
            )}

            {/* Note form */}
            {showNoteForm && (
                <Modal title="Neue Notiz" onClose={() => setShowNoteForm(false)}>
                    <form onSubmit={e => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        createNote.mutate({
                            title: fd.get('title') as string,
                            contentMarkdown: fd.get('content') as string,
                        });
                    }}>
                        <div className="space-y-4">
                            <input name="title" required placeholder="Titel" className="input" />
                            <textarea name="content" required rows={8} placeholder="Markdown-Inhalt..." className="input font-mono text-xs" />
                        </div>
                        <FormButtons pending={createNote.isPending} onCancel={() => setShowNoteForm(false)} />
                    </form>
                </Modal>
            )}

            {/* Field form */}
            {showFieldForm && (
                <Modal title="Neues Feld" onClose={() => setShowFieldForm(false)}>
                    <form onSubmit={e => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        createField.mutate({
                            name: fd.get('name') as string,
                            value: fd.get('value') as string,
                            fieldType: fd.get('fieldType') as FieldType,
                        });
                    }}>
                        <div className="space-y-4">
                            <input name="name" required placeholder="Name, z.B. Supportvertrag" className="input" />
                            <input name="value" required placeholder="Wert" className="input" />
                            <select name="fieldType" className="input" defaultValue="TEXT">
                                <option value="TEXT">Text</option>
                                <option value="NUMBER">Zahl</option>
                                <option value="URL">URL</option>
                                <option value="DATE">Datum</option>
                            </select>
                        </div>
                        <FormButtons pending={createField.isPending} onCancel={() => setShowFieldForm(false)} />
                    </form>
                </Modal>
            )}
        </div>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="modal-overlay">
            <div className="modal-content max-w-md">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="btn-icon"><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

function FormButtons({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
    return (
        <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="btn-secondary">Abbrechen</button>
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
                {pending ? 'Speichere...' : 'Speichern'}
            </button>
        </div>
    );
}
