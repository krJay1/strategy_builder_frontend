import React from 'react';
import { MarginResult } from '../types/strategy';
import { Landmark, ShieldCheck, Wallet, AlertCircle } from 'lucide-react';

interface MarginCardProps {
  margin?: MarginResult | null;
  isLoading?: boolean;
}

export const MarginCard: React.FC<MarginCardProps> = ({ margin }) => {
  const fmt = (v?: number | null) => {
    if (v === undefined || v === null || isNaN(Number(v))) return '—';
    return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const hasShortfall = (margin?.margin_shortfall || 0) > 0;
  const errorMessage = margin?.error || margin?.error_message;

  return (
    <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-4 shadow-sm space-y-3 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Margin & Capital Requirements
          </h3>
        </div>
      </div>

      {/* Error / RMS Message / Status Notice */}
      {errorMessage ? (
        <div className="text-xs text-amber-700 dark:text-amber-400/90 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-2.5 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <span>Notice: {errorMessage}</span>
        </div>
      ) : !margin ? (
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0d1117]/50 border border-slate-200 dark:border-[#232a35] p-2.5 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <span>Margin requirements will be calculated upon clicking &quot;Analyze &amp; Subscribe&quot;.</span>
        </div>
      ) : null}

      {/* 3 Metric Cards - ALWAYS DISPLAYED */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* 1. Required Margin */}
        <div className="bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Required Margin
            </span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {fmt(margin?.required)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Total funds needed to execute</div>
        </div>

        {/* 2. Available Margin */}
        <div className="bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" /> Available Margin
            </span>
          </div>
          <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
            {fmt(margin?.available_margin)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Free balance in trading account</div>
        </div>

        {/* 3. Margin Shortfall */}
        <div className="bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <AlertCircle className={`w-3.5 h-3.5 ${hasShortfall ? 'text-rose-500 dark:text-rose-400' : 'text-amber-500 dark:text-amber-400/80'}`} /> Margin Shortfall
            </span>
          </div>
          <div className={`text-base font-bold font-mono mt-1 ${hasShortfall ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>
            {fmt(margin?.margin_shortfall)}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {hasShortfall
              ? 'Additional funds required to place order'
              : margin
              ? 'No shortfall detected'
              : 'Shortfall calculation pending'}
          </div>
        </div>
      </div>
    </div>
  );
};
