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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Max Profit */}
      <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/40 transition">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-80" />
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Max Profit</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="text-base font-bold font-mono text-emerald-400">
          {formatCurrency(payoff.max_profit)}
        </div>
      </div>

      {/* Max Loss */}
      <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/40 transition">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 to-rose-400 opacity-80" />
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Max Loss</span>
          <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div className="text-base font-bold font-mono text-rose-400">
          {formatCurrency(payoff.max_loss)}
        </div>
      </div>

      {/* Risk : Reward */}
      <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/40 transition">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-400 opacity-80" />
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Risk : Reward</span>
          <Scale className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="text-base font-bold font-mono text-slate-100">
          {payoff.risk_reward || '—'}
        </div>
      </div>

      {/* Probability of Profit (POP) */}
      <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/40 transition">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 opacity-80" />
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Prob. of Profit</span>
          <Percent className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-base font-bold font-mono text-amber-300">
          {payoff.pop > 0 ? `${(payoff.pop * 100).toFixed(1)}%` : '—'}
        </div>
      </div>

      {/* Net Premium */}
      <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/40 transition">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-cyan-400 opacity-80" />
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Net Premium</span>
          <Wallet className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
              isNetCredit
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {isNetCredit ? 'Credit' : 'Debit'}
          </span>
          <span className="text-sm font-bold font-mono text-slate-100">
            ₹{Math.abs(payoff.net_premium || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Break-Evens */}
      <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden group hover:border-violet-500/40 transition">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-violet-400 opacity-80" />
        <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
          <span className="font-medium">Break-Even(s)</span>
          <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="text-xs font-bold font-mono text-slate-200 truncate">
          {breakEvens.length > 0
            ? breakEvens.map((b) => `₹${b.toFixed(0)}`).join(' | ')
            : 'None'}
        </div>
      </div>
    </div>
  );
};
