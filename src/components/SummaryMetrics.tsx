import React from 'react';
import { ArrowDownRight, ArrowUpRight, Percent, Scale, ShieldAlert, Wallet } from 'lucide-react';
import { PayoffResult } from '../types/strategy';

interface SummaryMetricsProps {
  payoff?: PayoffResult;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ payoff }) => {
  if (!payoff) return null;

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return 'Unlimited';
    if (val > 1e8 || val < -1e8) return 'Unlimited';
    const isNeg = val < 0;
    const formatted = Math.abs(val).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    });
    return isNeg ? `-₹${formatted}` : `₹${formatted}`;
  };

  const isNetCredit = payoff.net_premium > 0;
  const breakEvens: number[] = Array.isArray(payoff.break_evens)
    ? payoff.break_evens.map((be: any) => (typeof be === 'number' ? be : be.spot))
    : [];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {/* Max Profit */}
      <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#3c434d] transition shadow-sm">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
          <span className="font-medium">Max Profit</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
          {formatCurrency(payoff.max_profit)}
        </div>
      </div>

      {/* Max Loss */}
      <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#3c434d] transition shadow-sm">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
          <span className="font-medium">Max Loss</span>
          <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
          {formatCurrency(payoff.max_loss)}
        </div>
      </div>

      {/* Risk : Reward */}
      <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#3c434d] transition shadow-sm">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
          <span className="font-medium">Risk : Reward</span>
          <Scale className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
        </div>
        <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
          {payoff.risk_reward || '—'}
        </div>
      </div>

      {/* Probability of Profit (POP) */}
      <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#3c434d] transition shadow-sm">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
          <span className="font-medium">Prob. of Profit</span>
          <Percent className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
        </div>
        <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
          {payoff.pop > 0
            ? `${(payoff.pop <= 1 ? payoff.pop * 100 : payoff.pop).toFixed(1)}%`
            : '—'}
        </div>
      </div>

      {/* Net Premium */}
      <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#3c434d] transition shadow-sm">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
          <span className="font-medium">Net Premium</span>
          <Wallet className={`w-3.5 h-3.5 ${isNetCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
        </div>
        <div
          className={`text-base font-bold font-mono ${
            isNetCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {formatCurrency(payoff.net_premium)}
        </div>
      </div>

      {/* Break-Evens */}
      <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-3 flex flex-col justify-between hover:border-slate-300 dark:hover:border-[#3c434d] transition shadow-sm">
        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-1">
          <span className="font-medium">Break-Even(s)</span>
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
        </div>
        <div className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200 truncate">
          {breakEvens.length > 0
            ? breakEvens.map((b) => `₹${b.toFixed(0)}`).join(' | ')
            : 'None'}
        </div>
      </div>
    </div>
  );
};
