import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface BalanceBarProps {
    totalCr: number;
    totalDr: number;
}

const BalanceBar: React.FC<BalanceBarProps> = ({ totalCr, totalDr }) => {
    const isBalanced = Math.abs(totalCr - totalDr) < 0.01;
    return (
        <div className="grid grid-cols-3 gap-3 mt-4">
            <div className={`rounded-xl p-3 text-center font-semibold text-sm ${isBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                Cr = {totalCr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`rounded-xl p-3 text-center font-semibold text-sm ${isBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                Dr = {totalDr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className={`rounded-xl p-3 text-center font-semibold text-sm flex items-center justify-center gap-2 ${isBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {isBalanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {isBalanced ? 'Dr = Cr' : 'Not Balanced'}
            </div>
        </div>
    );
};

export default BalanceBar;
