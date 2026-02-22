import React from 'react';

interface FormSectionProps {
    title?: string;
    description?: string;
    children: React.ReactNode;
    columns?: 2 | 3;
}

const FormSection: React.FC<FormSectionProps> = ({ title, description, children, columns = 2 }) => {
    return (
        <div className="space-y-4">
            {title && (
                <div className="mb-4">
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
                </div>
            )}
            <div className={`grid ${columns === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                {children}
            </div>
        </div>
    );
};

export default FormSection;
