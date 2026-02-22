import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    iconBg?: string;
    iconColor?: string;
    subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBg = 'bg-emerald-50', iconColor = 'text-emerald-600', subtitle }) => {
    return (
        <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100/80 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
                {icon}
            </div>
            <div>
                <p className="text-xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{subtitle || title}</p>
            </div>
        </div>
    );
};

export default StatCard;
