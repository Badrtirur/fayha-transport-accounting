import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    labelAr?: string;
}

export interface OptionGroup {
    label: string;
    options: Option[];
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    showArabic?: boolean;
    /** Grouped options — when provided, renders group headers with item counts */
    groups?: OptionGroup[];
    /** Multi-select mode: value is comma-separated IDs, onChange returns comma-separated IDs */
    multi?: boolean;
    /** Callback for multi-select mode — receives array of selected values */
    onMultiChange?: (values: string[]) => void;
    /** Currently selected values for multi-select mode */
    multiValue?: string[];
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options, value, onChange, placeholder = 'Select...', label, required, showArabic,
    groups, multi, onMultiChange, multiValue,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Flatten groups into options for backward compat (search, selected lookup, etc.)
    const allOptions = useMemo(() => {
        if (groups && groups.length > 0) {
            return groups.flatMap(g => g.options);
        }
        return options;
    }, [groups, options]);

    const filtered = allOptions.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        (o.labelAr && o.labelAr.includes(search))
    );

    // Build filtered groups (only when groups prop is used)
    const filteredGroups = useMemo(() => {
        if (!groups || groups.length === 0) return null;
        const lowerSearch = search.toLowerCase();
        return groups
            .map(g => ({
                ...g,
                options: g.options.filter(o =>
                    o.label.toLowerCase().includes(lowerSearch) ||
                    (o.labelAr && o.labelAr.includes(search))
                ),
            }))
            .filter(g => g.options.length > 0);
    }, [groups, search]);

    const renderOptionLabel = (option: Option) =>
        showArabic && option.labelAr ? `${option.label} - ${option.labelAr}` : option.label;

    // ── Grouped dropdown list for single-select ──
    const renderGroupedList = (onSelect: (val: string) => void, selectedValue?: string) => {
        if (!filteredGroups) return null;
        if (filteredGroups.length === 0) {
            return <div className="px-3 py-4 text-sm text-slate-400 text-center">No results found</div>;
        }
        return filteredGroups.map(group => (
            <div key={group.label}>
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{group.label}</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {group.options.length}
                    </span>
                </div>
                {group.options.map(option => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onSelect(option.value)}
                        className={`w-full text-left px-3 pl-5 py-2.5 text-sm hover:bg-emerald-50 transition-colors ${
                            option.value === selectedValue ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                        }`}
                    >
                        {renderOptionLabel(option)}
                    </button>
                ))}
            </div>
        ));
    };

    // ── Grouped dropdown list for multi-select ──
    const renderGroupedMultiList = (selectedSet: Set<string>, toggleItem: (val: string) => void) => {
        if (!filteredGroups) return null;
        if (filteredGroups.length === 0) {
            return <div className="px-3 py-4 text-sm text-slate-400 text-center">No results found</div>;
        }
        return filteredGroups.map(group => (
            <div key={group.label}>
                <div className="sticky top-0 z-10 px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{group.label}</span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {group.options.length}
                    </span>
                </div>
                {group.options.map(option => {
                    const isChecked = selectedSet.has(option.value);
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleItem(option.value)}
                            className={`w-full text-left px-3 pl-5 py-2.5 text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 ${
                                isChecked ? 'bg-emerald-50/50 text-emerald-700' : 'text-slate-700'
                            }`}
                        >
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                            }`}>
                                {isChecked && <Check className="h-3 w-3 text-white" />}
                            </div>
                            {renderOptionLabel(option)}
                        </button>
                    );
                })}
            </div>
        ));
    };

    // Multi-select mode
    if (multi && onMultiChange && multiValue) {
        const selectedSet = new Set(multiValue);
        const allSelected = allOptions.length > 0 && allOptions.every(o => selectedSet.has(o.value));
        const useGroups = filteredGroups !== null;

        const toggleItem = (val: string) => {
            if (selectedSet.has(val)) {
                onMultiChange(multiValue.filter(v => v !== val));
            } else {
                onMultiChange([...multiValue, val]);
            }
        };

        const toggleAll = () => {
            if (allSelected) {
                onMultiChange([]);
            } else {
                onMultiChange(allOptions.map(o => o.value));
            }
        };

        const selectedLabels = allOptions
            .filter(o => selectedSet.has(o.value))
            .map(o => o.label);

        const displayText = selectedLabels.length === 0
            ? placeholder
            : selectedLabels.length === allOptions.length && allOptions.length > 1
                ? `All selected (${selectedLabels.length})`
                : selectedLabels.length <= 2
                    ? selectedLabels.join(', ')
                    : `${selectedLabels.length} items selected`;

        return (
            <div ref={ref} className="relative">
                {label && (
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
                    </label>
                )}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="input-premium w-full text-left flex items-center justify-between"
                >
                    <span className={multiValue.length > 0 ? 'text-slate-900 truncate' : 'text-slate-400'}>
                        {displayText}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {multiValue.length > 0 && (
                            <span onClick={(e) => { e.stopPropagation(); onMultiChange([]); setSearch(''); }} className="p-0.5 hover:bg-slate-100 rounded">
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </span>
                        )}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {/* Selected chips */}
                {multiValue.length > 0 && multiValue.length <= 4 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {allOptions.filter(o => selectedSet.has(o.value)).map(o => (
                            <span
                                key={o.value}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-200"
                            >
                                {o.label.length > 30 ? o.label.slice(0, 30) + '...' : o.label}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleItem(o.value); }}
                                    className="hover:text-rose-500"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 max-h-72 overflow-hidden">
                        <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                                    placeholder="Search..."
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto max-h-52">
                            {/* Select All option */}
                            {allOptions.length > 1 && !search && (
                                <button
                                    type="button"
                                    onClick={toggleAll}
                                    className={`w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 border-b border-slate-100 font-semibold ${
                                        allSelected ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'
                                    }`}
                                >
                                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                        allSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                                    }`}>
                                        {allSelected && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    Select All ({allOptions.length} items)
                                </button>
                            )}
                            {useGroups ? (
                                renderGroupedMultiList(selectedSet, toggleItem)
                            ) : (
                                filtered.length === 0 ? (
                                    <div className="px-3 py-4 text-sm text-slate-400 text-center">No results found</div>
                                ) : (
                                    filtered.map(option => {
                                        const isChecked = selectedSet.has(option.value);
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => toggleItem(option.value)}
                                                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 ${
                                                    isChecked ? 'bg-emerald-50/50 text-emerald-700' : 'text-slate-700'
                                                }`}
                                            >
                                                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                    isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                                                }`}>
                                                    {isChecked && <Check className="h-3 w-3 text-white" />}
                                                </div>
                                                {renderOptionLabel(option)}
                                            </button>
                                        );
                                    })
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Single-select mode
    const selected = allOptions.find(o => o.value === value);
    const useGroups = filteredGroups !== null;

    return (
        <div ref={ref} className="relative">
            {label && (
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
            )}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="input-premium w-full text-left flex items-center justify-between"
            >
                <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
                    {selected ? renderOptionLabel(selected) : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {value && (
                        <span onClick={(e) => { e.stopPropagation(); onChange(''); setSearch(''); }} className="p-0.5 hover:bg-slate-100 rounded">
                            <X className="h-3.5 w-3.5 text-slate-400" />
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-lg border border-slate-200 max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
                                placeholder="Search..."
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto max-h-48">
                        {useGroups ? (
                            renderGroupedList(
                                (val) => { onChange(val); setIsOpen(false); setSearch(''); },
                                value
                            )
                        ) : (
                            filtered.length === 0 ? (
                                <div className="px-3 py-4 text-sm text-slate-400 text-center">No results found</div>
                            ) : (
                                filtered.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => { onChange(option.value); setIsOpen(false); setSearch(''); }}
                                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 transition-colors ${
                                            option.value === value ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                                        }`}
                                    >
                                        {renderOptionLabel(option)}
                                    </button>
                                ))
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
