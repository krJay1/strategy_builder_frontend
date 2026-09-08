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

  // Local state for instrument ID to commit on blur or Enter
  const [localId, setLocalId] = React.useState<string>(
    underlying.exchange_instrument_id ? String(underlying.exchange_instrument_id) : ''
  );

  React.useEffect(() => {
    setLocalId(underlying.exchange_instrument_id ? String(underlying.exchange_instrument_id) : '');
  }, [underlying.exchange_instrument_id]);

  const handleCommitId = () => {
    const parsed = Number(localId.trim());
    const validId = !isNaN(parsed) && parsed > 0 ? parsed : 0;
    if (validId !== underlying.exchange_instrument_id) {
      onChange({
        ...underlying,
        exchange_instrument_id: validId,
      });
    }
  };

  return (
    <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-3.5 shadow-sm space-y-3 transition-colors duration-200">
      {/* Top Row: Underlying Header & Quick Select Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span>Underlying</span>
          {underlyingName && (
            <span className="text-slate-900 dark:text-white font-mono font-bold bg-slate-100 dark:bg-[#0d1117] px-2 py-0.5 rounded border border-slate-200 dark:border-[#232a35]">
              {underlyingName}
            </span>
          )}
        </div>

        {/* Quick Select Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0d1117] p-0.5 rounded-lg border border-slate-200 dark:border-[#232a35]">
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
                className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-[#1a2029]'
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
          <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider block">
            Segment
          </label>
          <div className="bg-slate-50 dark:bg-[#0d1117] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
            <select
              value={underlying.exchange_segment}
              onChange={(e) =>
                onChange({
                  ...underlying,
                  exchange_segment: Number(e.target.value),
                })
              }
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-mono font-medium focus:outline-none cursor-pointer w-full"
            >
              <option value={1} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">NSECM (1)</option>
              <option value={2} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">NSEFO (2)</option>
              <option value={11} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">BSECM (11)</option>
              <option value={12} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">BSEFO (12)</option>
              <option value={51} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">MCXFO (51)</option>
            </select>
          </div>
        </div>

        {/* 2. Instrument ID */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-1">
            <Hash className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            <span>Instrument ID</span>
          </label>
          <div className="bg-slate-50 dark:bg-[#0d1117] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
            <input
              type="number"
              value={localId}
              onChange={(e) => setLocalId(e.target.value)}
              onBlur={handleCommitId}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              placeholder="e.g. 26000"
              className="bg-transparent text-xs text-slate-900 dark:text-slate-100 font-mono font-bold w-full focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* 3. Spot Price */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              <span>Spot</span>
            </label>
            {liveSpot !== undefined && liveSpot > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...underlying, spot: liveSpot })}
                title="Sync Spot with Live LTP"
                className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/15 hover:bg-cyan-100 dark:hover:bg-cyan-500/25 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-500/30 transition-all active:scale-95"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
                ₹{liveSpot.toFixed(1)}
              </button>
            )}
          </div>
          <div className="bg-slate-50 dark:bg-[#0d1117] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
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
              className="bg-transparent text-xs text-emerald-600 dark:text-emerald-300 font-bold font-mono w-full focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* 4. Target Date */}
        <div className="space-y-1">
          <label className="text-[10px] text-amber-600 dark:text-amber-300 uppercase font-semibold tracking-wider flex items-center gap-1" title="Simulate intermediate P&L before expiry">
            <Calendar className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            <span>Target Date (T+N)</span>
          </label>
          <div className="bg-slate-50 dark:bg-[#0d1117] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => onTargetDateChange(e.target.value)}
              title="Target Date (T+N) for time decay simulation"
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer w-full font-mono text-[11px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
