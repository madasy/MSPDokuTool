import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, FileText, CheckCircle2 } from 'lucide-react';
import {
    DocumentationService,
    SECTION_LABELS,
    FIELD_LABELS,
    type DocumentationOverview,
} from '../services/DocumentationService';
import { useToast } from '../components/ui/Toast';

const SECTION_TYPES = Object.keys(SECTION_LABELS);

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

export default function DocumentationPage() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const { addToast } = useToast();
    const queryClient = useQueryClient();

    const [selectedType, setSelectedType] = useState<string>(SECTION_TYPES[0]);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState<string>('');

    // Overview list (completion status for sidebar)
    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ['docs', tenantId, 'overview'],
        queryFn: () => DocumentationService.getOverview(tenantId!),
        enabled: !!tenantId,
    });

    // Selected section data
    const { data: section, isLoading: sectionLoading } = useQuery({
        queryKey: ['docs', tenantId, selectedType],
        queryFn: () => DocumentationService.getSection(tenantId!, selectedType),
        enabled: !!tenantId && !!selectedType,
        retry: false,
    });

    // Populate form when section data loads
    useEffect(() => {
        if (section) {
            const fields = FIELD_LABELS[selectedType] ?? {};
            const populated: Record<string, string> = {};
            for (const key of Object.keys(fields)) {
                populated[key] = section.structuredData?.[key] ?? '';
            }
            setFormData(populated);
            setNotes(section.notes ?? '');
        } else {
            // Section doesn't exist yet — clear form
            const fields = FIELD_LABELS[selectedType] ?? {};
            const empty: Record<string, string> = {};
            for (const key of Object.keys(fields)) {
                empty[key] = '';
            }
            setFormData(empty);
            setNotes('');
        }
    }, [section, selectedType]);

    const { mutate: saveSection, isPending: isSaving } = useMutation({
        mutationFn: () =>
            DocumentationService.updateSection(tenantId!, selectedType, {
                structuredData: formData,
                notes: notes || undefined,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['docs', tenantId] });
            addToast({ type: 'success', title: 'Gespeichert', message: 'Abschnitt wurde gespeichert.' });
        },
        onError: (err: Error) => {
            addToast({ type: 'error', title: 'Fehler', message: err.message });
        },
    });

    const overviewMap: Record<string, DocumentationOverview> =
        overview?.reduce((acc, o) => ({ ...acc, [o.sectionType]: o }), {}) ?? {};

    const fieldLabels = FIELD_LABELS[selectedType] ?? {};

    return (
        <div className="page flex flex-col h-full">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="page-title flex items-center gap-2">
                    <FileText size={22} className="text-primary-500" />
                    Dokumentation
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Strukturierte Infrastruktur-Dokumentation nach Bereichen
                </p>
            </div>

            {/* Two-panel layout */}
            <div className="flex gap-5 flex-1 min-h-0">
                {/* Left sidebar — section list */}
                <aside className="w-64 min-w-[256px] flex flex-col gap-1 overflow-y-auto">
                    {overviewLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 size={20} className="animate-spin text-slate-400" />
                        </div>
                    ) : (
                        SECTION_TYPES.map((type) => {
                            const info = overviewMap[type];
                            const pct = info?.completionPercent ?? 0;
                            const isActive = selectedType === type;
                            return (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={[
                                        'w-full text-left px-3 py-3 rounded-xl transition-colors border',
                                        isActive
                                            ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50',
                                    ].join(' ')}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={[
                                            'text-xs font-semibold leading-tight',
                                            isActive
                                                ? 'text-primary-700 dark:text-primary-300'
                                                : 'text-slate-700 dark:text-slate-300',
                                        ].join(' ')}>
                                            {SECTION_LABELS[type]}
                                        </span>
                                        {pct === 100 && (
                                            <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                                        )}
                                    </div>
                                    {/* Completion bar */}
                                    <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                        <div
                                            className={[
                                                'h-full rounded-full transition-all',
                                                pct === 100
                                                    ? 'bg-green-500'
                                                    : pct > 0
                                                    ? 'bg-primary-500'
                                                    : 'bg-slate-300 dark:bg-slate-600',
                                            ].join(' ')}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                            {info?.updatedAt ? formatDate(info.updatedAt) : 'Noch nicht erfasst'}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                            {pct}%
                                        </span>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </aside>

                {/* Right content — section editor */}
                <div className="flex-1 overflow-y-auto">
                    {sectionLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <div className="card p-6">
                            {/* Section header */}
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        {SECTION_LABELS[selectedType]}
                                    </h2>
                                    {section && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                            Version {section.version}
                                            {section.updatedBy ? ` · ${section.updatedBy}` : ''}
                                            {section.updatedAt ? ` · ${formatDate(section.updatedAt)}` : ''}
                                        </p>
                                    )}
                                </div>
                                {/* Completion badge */}
                                {overviewMap[selectedType] && (
                                    <span className={[
                                        'text-xs font-semibold px-2.5 py-1 rounded-full',
                                        (overviewMap[selectedType].completionPercent ?? 0) === 100
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : (overviewMap[selectedType].completionPercent ?? 0) > 0
                                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
                                    ].join(' ')}>
                                        {overviewMap[selectedType].completionPercent ?? 0}% vollständig
                                    </span>
                                )}
                            </div>

                            {/* Structured fields */}
                            <div className="space-y-5">
                                {Object.entries(fieldLabels).map(([key, label]) => (
                                    <div key={key}>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                                            {label}
                                        </label>
                                        <textarea
                                            className="input w-full resize-none"
                                            rows={3}
                                            placeholder={`${label} …`}
                                            value={formData[key] ?? ''}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, [key]: e.target.value }))
                                            }
                                        />
                                    </div>
                                ))}

                                {/* Divider */}
                                <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                                        Notizen
                                    </label>
                                    <textarea
                                        className="input w-full resize-none"
                                        rows={4}
                                        placeholder="Interne Notizen zu diesem Abschnitt …"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                    />
                                </div>

                                {/* Save button */}
                                <div className="flex justify-end pt-2">
                                    <button
                                        className="btn-primary flex items-center gap-2"
                                        onClick={() => saveSection()}
                                        disabled={isSaving}
                                    >
                                        {isSaving && <Loader2 size={14} className="animate-spin" />}
                                        Speichern
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
