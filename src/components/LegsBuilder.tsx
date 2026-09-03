import React from 'react';
import { Plus, Minus, Trash2, Layers, TrendingUp, Play, Zap } from 'lucide-react';
import { LegRequest } from '../types/strategy';

interface LegsBuilderProps {
  legs: LegRequest[];
  onChange: (legs: LegRequest[]) => void;
  disabled?: boolean;
  livePrices?: Record<number, number>;
  onAnalyze?: () => void;
  isLoading?: boolean;
}

export const LegsBuilder: React.FC<LegsBuilderProps> = ({
  legs,
  onChange,
  disabled,
  livePrices = {},
  onAnalyze,
  isLoading,
}) => {
  const handleAddLeg = () => {
    const newLeg: LegRequest = {
      exchange_segment: 2, // NSEFO default
      exchange_instrument_id: 0,
      side: 'BUY',
      lots: 1,
      entry_price: 100,
    };
    onChange([...legs, newLeg]);
  };

  const handleRemoveLeg = (index: number) => {
    const updated = legs.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateLeg = (index: number, field: keyof LegRequest, value: any) => {
    const updated = legs.map((leg, i) => {
      if (i === index) {
        return { ...leg, [field]: value };
      }
      return leg;
    });
    onChange(updated);
  };

  return (
    <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Strategy Legs ({legs.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Analyze & Subscribe Action Button (Icon with Tooltip opening on Top) */}
          {onAnalyze && (
            <div className="relative group flex items-center">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={disabled || isLoading}
                className="px-2 py-1 flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-sm border border-indigo-400/30 transition active:scale-95 disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : 'fill-current'}`} />
              </button>

              {/* Tooltip positioned strictly on TOP */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-in fade-in duration-150">
                <div className="bg-[#141619] text-white text-[10px] font-semibold py-1 px-2.5 rounded-md border border-[#3b414b] shadow-2xl">
                  {isLoading ? 'Subscribing & Streaming...' : 'Analyze & Subscribe'}
                </div>
                <div className="w-2 h-2 bg-[#141619] border-r border-b border-[#3b414b] rotate-45 -mt-1"></div>
              </div>
            </div>
          )}

          {/* Add Leg Button */}
          <button
            type="button"
            onClick={handleAddLeg}
            disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Leg
          </button>
        </div>
      </div>

      {legs.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-[#2d3239] rounded-lg bg-[#141619]/50">
          <p className="text-xs text-slate-500">No strategy legs configured.</p>
          <button
            onClick={handleAddLeg}
            className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            + Add Leg to Start
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-[#2d3239] text-[11px] uppercase tracking-wider">
                <th className="pb-2.5 font-semibold text-slate-500 pl-2">#</th>
                <th className="pb-2.5 font-semibold">Side</th>
                <th className="pb-2.5 font-semibold">Segment</th>
                <th className="pb-2.5 font-semibold">Instrument ID</th>
                <th className="pb-2.5 font-semibold">Lots</th>
                <th className="pb-2.5 font-semibold text-cyan-300">Live LTP</th>
                <th className="pb-2.5 font-semibold">Entry Price (₹)</th>
                <th className="pb-2.5 text-right font-semibold pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262a31] font-mono">
              {legs.map((leg, index) => {
                const isBuy = leg.side === 'BUY';
                const liveLtp = livePrices[leg.exchange_instrument_id];
                const currentLots = leg.lots || 1;
                const currentEntry = Number(leg.entry_price ?? leg.price ?? 0);

                return (
                  <tr key={index} className="hover:bg-[#25282e]/50 transition">
                    <td className="py-2.5 text-slate-500 w-8 pl-2">{index + 1}</td>

                    {/* Side Toggle Button (B / S) */}
                    <td className="py-2.5 w-10">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateLeg(index, 'side', isBuy ? 'SELL' : 'BUY')
                        }
                        title={isBuy ? 'Side: BUY (click to toggle SELL)' : 'Side: SELL (click to toggle BUY)'}
                        className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center transition border ${
                          isBuy
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
                        }`}
                      >
                        {isBuy ? 'B' : 'S'}
                      </button>
                    </td>

                    {/* Segment Selector */}
                    <td className="py-2.5 w-32">
                      <select
                        value={leg.exchange_segment}
                        onChange={(e) =>
                          handleUpdateLeg(index, 'exchange_segment', Number(e.target.value))
                        }
                        className="bg-[#141619] border border-[#2d3239] rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value={2}>NSEFO (2)</option>
                        <option value={1}>NSECM (1)</option>
                        <option value={12}>BSEFO (12)</option>
                        <option value={11}>BSECM (11)</option>
                        <option value={51}>MCXFO (51)</option>
                      </select>
                    </td>

                    {/* Instrument ID */}
                    <td className="py-2.5">
                      <input
                        type="number"
                        value={leg.exchange_instrument_id || ''}
                        onChange={(e) =>
                          handleUpdateLeg(
                            index,
                            'exchange_instrument_id',
                            Number(e.target.value)
                          )
                        }
                        placeholder="e.g. 144396"
                        className="bg-[#141619] border border-[#2d3239] rounded-md px-2.5 py-1 text-slate-100 text-xs w-28 focus:outline-none focus:border-indigo-500 font-bold"
                      />
                    </td>

                    {/* Lots Stepper (Decrement / Input / Increment) */}
                    <td className="py-2.5 w-24">
                      <div className="flex items-center bg-[#141619] border border-[#2d3239] rounded-md overflow-hidden w-20">
                        <button
                          type="button"
                          disabled={disabled || currentLots <= 1}
                          onClick={() => handleUpdateLeg(index, 'lots', Math.max(1, currentLots - 1))}
                          className="px-1.5 py-1 text-slate-400 hover:text-slate-100 hover:bg-[#282d34] disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                          title="Decrease Lot (-1)"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={currentLots}
                          onChange={(e) =>
                            handleUpdateLeg(index, 'lots', Math.max(1, Number(e.target.value)))
                          }
                          className="bg-transparent text-center text-slate-100 text-xs w-full focus:outline-none font-bold py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleUpdateLeg(index, 'lots', currentLots + 1)}
                          className="px-1.5 py-1 text-slate-400 hover:text-slate-100 hover:bg-[#282d34] disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                          title="Increase Lot (+1)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Live LTP Display & 1-Click Sync */}
                    <td className="py-2.5 w-36">
                      {liveLtp !== undefined && liveLtp > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-300 font-bold text-xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            ₹{liveLtp.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateLeg(index, 'entry_price', liveLtp)}
                            title="Copy Live LTP to Entry Price"
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 transition"
                          >
                            <Zap className="w-2.5 h-2.5" />
                            Use
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-mono flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-slate-600" />
                          —
                        </span>
                      )}
                    </td>

                    {/* Entry Price Stepper (Decrement / Input / Increment) */}
                    <td className="py-2.5 w-36">
                      <div className="flex items-center bg-[#141619] border border-[#2d3239] rounded-md overflow-hidden w-28">
                        <button
                          type="button"
                          disabled={disabled || currentEntry <= 0.05}
                          onClick={() => {
                            const nextPrice = Math.max(0.05, Math.round((currentEntry - 0.5) * 100) / 100);
                            handleUpdateLeg(index, 'entry_price', nextPrice);
                          }}
                          className="px-1.5 py-1 text-slate-400 hover:text-slate-100 hover:bg-[#282d34] disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                          title="Decrease Price (-0.50)"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          step="0.05"
                          value={leg.entry_price ?? leg.price ?? ''}
                          onChange={(e) =>
                            handleUpdateLeg(index, 'entry_price', Number(e.target.value))
                          }
                          placeholder={liveLtp ? liveLtp.toFixed(2) : '0.00'}
                          className="bg-transparent text-center text-slate-100 text-xs w-full focus:outline-none font-bold py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            const nextPrice = Math.round((currentEntry + 0.5) * 100) / 100;
                            handleUpdateLeg(index, 'entry_price', nextPrice);
                          }}
                          className="px-1.5 py-1 text-slate-400 hover:text-slate-100 hover:bg-[#282d34] disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                          title="Increase Price (+0.50)"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Delete Action */}
                    <td className="py-2.5 text-right w-12 pr-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveLeg(index)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Delete Leg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
