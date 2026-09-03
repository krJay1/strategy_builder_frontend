import React from 'react';
import { MarginResult } from '../types/strategy';
import { Landmark, ShieldCheck, Wallet, AlertCircle } from 'lucide-react';

interface MarginCardProps {
  margin?: MarginResult;
}

export const MarginCard: React.FC<MarginCardProps> = ({ margin }) => {
  if (!margin) return null;

  const fmt = (v?: number) => {
    if (v === undefined || isNaN(v)) return '—';
    return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 1 })}`;
  };

  const hasShortfall = (margin.margin_shortfall || 0) > 0;

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
      </div>

      {margin.error ? (
        <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
          Margin warning: {margin.error}
        </div>
      ) : (
        <>
          {/* Primary Capital Status Cards (Required, Available, Shortfall) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* 1. Required Margin */}
            <div className="bg-[#141619] border border-[#282d34] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Required Margin
                </span>
              </div>
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {fmt(margin.required)}
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
                {fmt(margin.available_margin)}
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
              <div className="text-base font-bold font-mono text-slate-100 mt-1">
                {fmt(margin.margin_shortfall || 0)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {hasShortfall
                  ? 'Additional funds required to place order'
                  : 'No shortfall detected'}
              </div>
            </div>
          </div>

          {/* Detailed RMS Component Breakdown */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
            
            <div className="bg-[#141619] border border-[#282d34] rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Span Margin
              </div>
              <div className="text-xs font-semibold font-mono text-slate-200 mt-1">
                {fmt(margin.span_margin)}
              </div>
            </div>

            
            <div className="bg-[#141619] border border-[#282d34] rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Exposure Margin
              </div>
              <div className="text-xs font-semibold font-mono text-slate-200 mt-1">
                {fmt(margin.exposure_margin)}
              </div>
            </div>

            
            <div className="bg-[#141619] border border-[#282d34] rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Hedge Benefit
              </div>
              <div className="text-xs font-semibold font-mono text-indigo-300 mt-1">
                {margin.margin_benefit && margin.margin_benefit > 0
                  ? fmt(margin.margin_benefit)
                  : '—'}
              </div>
            </div>

            
            <div className="bg-[#141619] border border-[#282d34] rounded-lg p-2.5">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Net Premium
              </div>
              <div
                className={`text-xs font-semibold font-mono mt-1 ${
                  (margin.net_premium || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {fmt(margin.net_premium)}
              </div>
            </div>
          </div> */}
        </>
      )}
    </div>
  );
};
