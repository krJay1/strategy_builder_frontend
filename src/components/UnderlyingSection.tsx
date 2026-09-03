import React from 'react';
import { Calendar, Gauge, TrendingUp, Hash } from 'lucide-react';
import { UnderlyingRequest } from '../types/strategy';

interface UnderlyingSectionProps {
  underlying: UnderlyingRequest;
  onChange: (u: UnderlyingRequest) => void;
  targetDate: string;
  onTargetDateChange: (date: string) => void;
  liveSpot?: number;
  underlyingName?: string;
}

export const UnderlyingSection: React.FC<UnderlyingSectionProps> = ({
  underlying,
  onChange,
  targetDate,
  onTargetDateChange,
  liveSpot,
  underlyingName,
}) => {
  const commonUnderlyings = [
    { label: 'NIFTY', segment: 1, id: 26000, defaultSpot: 24500 },
    { label: 'BANKNIFTY', segment: 1, id: 26001, defaultSpot: 51200 },
    { label: 'FINNIFTY', segment: 1, id: 26037, defaultSpot: 23800 },
    { label: 'RELIANCE', segment: 1, id: 2885, defaultSpot: 1309.1 },
  ];

  return (
    <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-3.5 shadow-sm space-y-3">
      {/* Top Row: Underlying Header & Quick Select Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-indigo-400" />
          <span>Underlying</span>
          {underlyingName && (
            <span className="text-white font-mono font-bold bg-[#141619] px-2 py-0.5 rounded border border-[#282d34]">
              {underlyingName}
            </span>
          )}
        </div>

        {/* Quick Select Tabs */}
        <div className="flex items-center gap-1 bg-[#141619] p-0.5 rounded-lg border border-[#282d34]">
          {commonUnderlyings.map((u) => {
            const isSelected =
              underlying.exchange_instrument_id === u.id &&
              underlying.exchange_segment === u.segment;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() =>
                  onChange({
                    exchange_segment: u.segment,
                    exchange_instrument_id: u.id,
                    spot: u.defaultSpot,
                  })
                }
                className={`text-[11px] px-2 py-0.5 rounded font-medium transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {u.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Inputs for Segment, Instrument ID, Spot & Target Date */}
      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs items-center">
        {/* 1. Exchange Segment */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider block">
            Segment
          </label>
          <div className="bg-[#141619] px-2.5 py-1.5 rounded-lg border border-[#282d34] focus-within:border-indigo-500/50 transition">
            <select
              value={underlying.exchange_segment}
              onChange={(e) =>
                onChange({
                  ...underlying,
                  exchange_segment: Number(e.target.value),
                })
              }
              className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer w-full"
            >
              <option value={1} className="bg-[#1e2124]">NSECM (1)</option>
              <option value={2} className="bg-[#1e2124]">NSEFO (2)</option>
              <option value={11} className="bg-[#1e2124]">BSECM (11)</option>
              <option value={12} className="bg-[#1e2124]">BSEFO (12)</option>
              <option value={51} className="bg-[#1e2124]">MCXFO (51)</option>
            </select>
          </div>
        </div>

        {/* 2. Instrument ID */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-1">
            <Hash className="w-3 h-3 text-slate-500" />
            <span>Instrument ID</span>
          </label>
          <div className="bg-[#141619] px-2.5 py-1.5 rounded-lg border border-[#282d34] focus-within:border-indigo-500/50 transition">
            <input
              type="number"
              value={underlying.exchange_instrument_id || ''}
              onChange={(e) =>
                onChange({
                  ...underlying,
                  exchange_instrument_id: Number(e.target.value),
                })
              }
              placeholder="e.g. 26000"
              className="bg-transparent text-xs text-slate-100 font-mono font-bold w-full focus:outline-none"
            />
          </div>
        </div>

        {/* 3. Spot Price */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Spot</span>
            </label>
            {liveSpot !== undefined && liveSpot > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...underlying, spot: liveSpot })}
                title="Sync Spot with Live LTP"
                className="flex items-center gap-1 text-[9px] font-mono font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 px-1.5 py-0.2 rounded border border-cyan-500/30 transition"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                ₹{liveSpot.toFixed(1)}
              </button>
            )}
          </div>
          <div className="bg-[#141619] px-2.5 py-1.5 rounded-lg border border-[#282d34] focus-within:border-emerald-500/50 transition">
            <input
              type="number"
              step="any"
              value={underlying.spot || ''}
              onChange={(e) =>
                onChange({
                  ...underlying,
                  spot: Number(e.target.value),
                })
              }
              placeholder={liveSpot ? liveSpot.toFixed(2) : 'Spot Price'}
              className="bg-transparent text-xs text-emerald-300 font-bold font-mono w-full focus:outline-none"
            />
          </div>
        </div>

        {/* 4. Target Date */}
        <div className="space-y-1">
          <label className="text-[10px] text-amber-300 uppercase font-semibold tracking-wider" title="Simulate intermediate P&L before expiry">
            Target Date (T+N)
          </label>
          <div className="bg-[#141619] px-2.5 py-1.5 rounded-lg border border-[#282d34] focus-within:border-amber-500/50 transition">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => onTargetDateChange(e.target.value)}
              title="Target Date (T+N) for time decay simulation"
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer w-full font-mono text-[11px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
