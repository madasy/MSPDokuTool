import { useState, useRef, useEffect } from 'react';

interface InlineEditProps {
    value: string;
    onSave: (value: string) => void;
    placeholder?: string;
    className?: string;
    type?: 'text' | 'select';
    options?: { value: string; label: string }[];
}

export default function InlineEdit({ value, onSave, placeholder, className, type = 'text', options }: InlineEditProps) {
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

    useEffect(() => { setEditValue(value); }, [value]);
    useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

    const handleSave = () => {
        setEditing(false);
        if (editValue !== value) onSave(editValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') { setEditValue(value); setEditing(false); }
    };

    if (!editing) {
        return (
            <span
                onClick={() => setEditing(true)}
                className={`cursor-text hover:bg-primary-50 dark:hover:bg-primary-900/20 px-1 -mx-1 rounded transition-colors ${!value ? 'text-slate-300 dark:text-slate-600 italic' : ''} ${className || ''}`}
                title="Klicken zum Bearbeiten"
            >
                {value || placeholder || '—'}
            </span>
        );
    }

    if (type === 'select' && options) {
        return (
            <select
                ref={inputRef as React.RefObject<HTMLSelectElement>}
                value={editValue}
                onChange={e => { setEditValue(e.target.value); }}
                onBlur={handleSave}
                className="input-sm text-xs py-0.5 px-1"
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        );
    }

    return (
        <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="input-sm text-xs py-0.5 px-1 w-full"
            placeholder={placeholder}
        />
    );
}
