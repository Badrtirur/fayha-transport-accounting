import React from 'react';

interface Tab {
    key: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

interface TabNavProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (key: string) => void;
}

const TabNav: React.FC<TabNavProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="border-b border-slate-200">
            <nav className="flex gap-0 overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className={`relative flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                            activeTab === tab.key
                                ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {tab.icon && <span className="text-current">{tab.icon}</span>}
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                activeTab === tab.key
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                            }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default TabNav;
