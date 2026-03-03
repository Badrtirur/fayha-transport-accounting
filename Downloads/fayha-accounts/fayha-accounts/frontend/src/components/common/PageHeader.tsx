import React from 'react';
import { Plus, Download, Upload, Search } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    onAdd: () => void;
    onImport: () => void;
    onExport: () => void;
    addLabel?: string;
    addClassName?: string;
    showSearch?: boolean;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    onAdd,
    onImport,
    onExport,
    addLabel = 'Add New',
    addClassName = '',
    showSearch = true,
    searchValue,
    onSearchChange,
    children
}) => {
    return (
        <div className={`space-y-5 ${addClassName}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
                    {subtitle && <p className="text-slate-500 mt-1 text-sm">{subtitle}</p>}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onImport}
                        className="btn-ghost"
                        title="Import"
                    >
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">Import</span>
                    </button>
                    <button
                        onClick={onExport}
                        className="btn-secondary"
                        title="Export"
                    >
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                        onClick={onAdd}
                        className="btn-primary"
                    >
                        <Plus className="h-4 w-4" />
                        {addLabel}
                    </button>
                </div>
            </div>

            {showSearch && (
                <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl shadow-card border border-slate-100/80">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={`Search ${title.toLowerCase()}...`}
                            className="input-premium pl-10"
                            value={searchValue ?? ''}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {children}
        </div>
    );
};

export default PageHeader;
