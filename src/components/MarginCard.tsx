import React from 'react';
import { MarginResult } from '../types/strategy';
import { Landmark, ShieldCheck, Wallet, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface MarginCardProps {
  margin?: MarginResult | null;
  isLoading?: boolean;
}

export const MarginCard: React.FC<MarginCardProps> = ({ margin, isLoading }) => {
  const fmt = (v?: number | null) => {
    if (v === undefined || v === null || isNaN(Number(v))) return '—';
    return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const hasShortfall = (margin?.margin_shortfall || 0) > 0;
  const isVerified = Boolean(margin?.is_valid);
  const errorMessage = margin?.error || margin?.error_message;

  return (
    <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Margin & Capital Requirements
          </h3>
        </div>
        {/* <div>
          {isLoading ? (
            <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 animate-spin" /> Calculating...
            </span>
          ) : isVerified ? (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> RMS Verified
            </span>
          ) : margin ? (
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Unverified
            </span>
          ) : (
            <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> Awaiting Analysis
            </span>
          )}
        </div> */}
      </div>

      {/* Error / RMS Message / Status Notice */}
      {errorMessage ? (
        <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Notice: {errorMessage}</span>
        </div>
      ) : !margin ? (
        <div className="text-xs text-slate-400 bg-slate-800/40 border border-slate-700/50 p-2.5 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Margin requirements will be calculated upon clicking &quot;Analyze &amp; Subscribe&quot;.</span>
        </div>
      ) : null}

      {/* 3 Metric Cards - ALWAYS DISPLAYED */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* 1. Required Margin */}
        <div className="bg-[#141619] border border-[#282d34] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Required Margin
            </span>
          </div>
          <div className="text-base font-bold font-mono text-slate-100 mt-1">
            {fmt(margin?.required)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total funds needed to execute</div>
        </div>

        {/* 2. Available Margin */}
        <div className="bg-[#141619] border border-[#282d34] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-cyan-400" /> Available Margin
            </span>
          </div>
          <div className="text-base font-bold font-mono text-slate-100 mt-1">
            {fmt(margin?.available_margin)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Free balance in trading account</div>
        </div>

        {/* 3. Margin Shortfall */}
        <div className="bg-[#141619] border border-[#282d34] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <AlertCircle className={`w-3.5 h-3.5 ${hasShortfall ? 'text-rose-400' : 'text-amber-400/80'}`} /> Margin Shortfall
            </span>
          </div>
          <div className={`text-base font-bold font-mono mt-1 ${hasShortfall ? 'text-rose-400' : 'text-slate-100'}`}>
            {fmt(margin?.margin_shortfall)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
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
