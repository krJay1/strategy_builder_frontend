import React, { useState, useEffect } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Layers,
  TrendingUp,
  Play,
  Zap,
  ArrowUpDown,
  GripVertical,
} from 'lucide-react';
import { LegRequest } from '../types/strategy';

interface LegRowProps {
  leg: LegRequest;
  index: number;
  disabled?: boolean;
  liveLtp?: number;
  onUpdateLeg: (index: number, field: keyof LegRequest, value: any) => void;
  onRemoveLeg: (index: number) => void;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
  onDragLeave: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
  onDrop: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
  onDragEnd: (e: React.DragEvent<HTMLTableRowElement>) => void;
}

const LegRow: React.FC<LegRowProps> = ({
  leg,
  index,
  disabled,
  liveLtp,
  onUpdateLeg,
  onRemoveLeg,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const isBuy = leg.side === 'BUY';
  const currentLots = leg.lots || 1;
  const currentEntry = Number(leg.entry_price ?? leg.price ?? 0);

  // Local state for instrument ID to commit on focus loss (blur) or Enter key
  const [localId, setLocalId] = useState<string>(
    leg.exchange_instrument_id ? String(leg.exchange_instrument_id) : ''
  );

  useEffect(() => {
    setLocalId(leg.exchange_instrument_id ? String(leg.exchange_instrument_id) : '');
  }, [leg.exchange_instrument_id]);

  const handleCommitId = () => {
    const parsed = Number(localId.trim());
    const validId = !isNaN(parsed) && parsed > 0 ? parsed : 0;
    if (validId !== leg.exchange_instrument_id) {
      onUpdateLeg(index, 'exchange_instrument_id', validId);
    }
  };

  return (
    <tr
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragLeave={(e) => onDragLeave(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      className={`group transition-all duration-150 ${
        isDragging
          ? 'opacity-30 bg-indigo-950/40 border-2 border-dashed border-indigo-500/60 scale-[0.99]'
          : isDropTarget
          ? 'bg-indigo-500/15 border-t-2 border-indigo-500 shadow-md'
          : 'hover:bg-slate-50/80 dark:hover:bg-[#1c222b]/50'
      }`}
    >
      {/* Drag & Drop Handle */}
      <td className="py-2.5 w-6 pl-2 text-center">
        <div
          className={`cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 dark:hover:bg-[#232a35] transition ${
            disabled ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300'
          }`}
          title="Drag and drop to rearrange order"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </td>

      {/* Index Number */}
      <td className="py-2.5 text-slate-400 dark:text-slate-500 w-7 font-mono font-semibold text-xs">{index + 1}</td>

      {/* Side Toggle Button (B / S) */}
      <td className="py-2.5 w-10">
        <button
          type="button"
          onClick={() =>
            onUpdateLeg(index, 'side', isBuy ? 'SELL' : 'BUY')
          }
          title={isBuy ? 'Side: BUY (click to toggle SELL)' : 'Side: SELL (click to toggle BUY)'}
          className={`text-xs font-bold w-6 h-6 rounded-md flex items-center justify-center transition-all shadow-2xs border active:scale-90 ${
            isBuy
              ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/25'
              : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/25'
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
            onUpdateLeg(index, 'exchange_segment', Number(e.target.value))
          }
          className="bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] focus:border-indigo-500 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 font-mono font-medium text-xs focus:outline-none cursor-pointer transition-all"
        >
          <option value={2} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">NSEFO (2)</option>
          <option value={1} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">NSECM (1)</option>
          <option value={12} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">BSEFO (12)</option>
          <option value={11} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">BSECM (11)</option>
          <option value={51} className="bg-white dark:bg-[#151921] text-slate-900 dark:text-slate-100">MCXFO (51)</option>
        </select>
      </td>

      {/* Instrument ID */}
      <td className="py-2.5">
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
          placeholder="e.g. 144396"
          className="bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] focus:border-indigo-500 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-100 font-mono font-bold text-xs w-28 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
        />
      </td>

      {/* Lots Stepper (Decrement / Input / Increment) */}
      <td className="py-2.5 w-24">
        <div className="flex items-center bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] focus-within:border-indigo-500 rounded-lg overflow-hidden w-22 transition-all">
          <button
            type="button"
            disabled={disabled || currentLots <= 1}
            onClick={() => onUpdateLeg(index, 'lots', Math.max(1, currentLots - 1))}
            className="px-2 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-[#1c222b] disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
            title="Decrease Lot (-1)"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min="1"
            value={currentLots}
            onChange={(e) =>
              onUpdateLeg(index, 'lots', Math.max(1, Number(e.target.value)))
            }
            className="bg-transparent text-center text-slate-900 dark:text-slate-100 text-xs w-full focus:outline-none font-bold font-mono py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onUpdateLeg(index, 'lots', currentLots + 1)}
            className="px-2 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-[#1c222b] disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
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
            <span className="text-cyan-600 dark:text-cyan-300 font-mono font-bold text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
              ₹{liveLtp.toFixed(2)}
            </span>
            <button
              type="button"
              onClick={() => onUpdateLeg(index, 'entry_price', liveLtp)}
              title="Copy Live LTP to Entry Price"
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-sans font-bold bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-500/25 border border-cyan-200 dark:border-cyan-500/30 transition-all shadow-2xs active:scale-95"
            >
              <Zap className="w-2.5 h-2.5" />
              Use
            </button>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-[11px] font-mono flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-slate-400 dark:text-slate-600" />
            —
          </span>
        )}
      </td>

      {/* Entry Price Stepper (Decrement / Input / Increment) */}
      <td className="py-2.5 w-36">
        <div className="flex items-center bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] focus-within:border-indigo-500 rounded-lg overflow-hidden w-28 transition-all">
          <button
            type="button"
            disabled={disabled || currentEntry <= 0.05}
            onClick={() => {
              const nextPrice = Math.max(0.05, Math.round((currentEntry - 0.5) * 100) / 100);
              onUpdateLeg(index, 'entry_price', nextPrice);
            }}
            className="px-2 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-[#1c222b] disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
            title="Decrease Price (-0.50)"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            step="0.05"
            value={leg.entry_price ?? leg.price ?? ''}
            onChange={(e) =>
              onUpdateLeg(index, 'entry_price', Number(e.target.value))
            }
            placeholder={liveLtp ? liveLtp.toFixed(2) : '0.00'}
            className="bg-transparent text-center text-slate-900 dark:text-slate-100 text-xs w-full focus:outline-none font-bold font-mono py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const nextPrice = Math.round((currentEntry + 0.5) * 100) / 100;
              onUpdateLeg(index, 'entry_price', nextPrice);
            }}
            className="px-2 py-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/80 dark:hover:bg-[#1c222b] disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
            title="Increase Price (+0.50)"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </td>

      {/* Action (Delete) */}
      <td className="py-2.5 text-right w-12 pr-2">
        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemoveLeg(index)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all active:scale-90"
            title="Delete Leg"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

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

  const handleAutoArrange = () => {
    // Reorder BUY hedge legs first, then SELL legs
    const buys = legs.filter((l) => l.side === 'BUY');
    const sells = legs.filter((l) => l.side !== 'BUY');
    onChange([...buys, ...sells]);
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

  // Drag-and-Drop Event Handlers (HTML5 Drag & Drop API)
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    if (disabled || draggedIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragLeave = (_e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    if (dropTargetIndex === index) {
      setDropTargetIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, targetIndex: number) => {
    e.preventDefault();
    if (disabled) return;

    const sourceIndex = draggedIndex !== null
      ? draggedIndex
      : Number(e.dataTransfer.getData('text/plain'));

    if (
      isNaN(sourceIndex) ||
      sourceIndex === targetIndex ||
      sourceIndex < 0 ||
      sourceIndex >= legs.length
    ) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      return;
    }

    const reordered = [...legs];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    onChange(reordered);
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-4 shadow-sm transition-colors duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">
            Strategy Legs ({legs.length})
          </h3>
          {legs.length > 1 && (
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans hidden sm:inline">
              (Drag rows to reorder)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-Arrange (BUY First) Button */}
          {legs.length > 1 && (
            <button
              type="button"
              onClick={handleAutoArrange}
              disabled={disabled || isLoading}
              title="Rearrange legs with BUY orders first to optimize margin benefit"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-[#0d1117] dark:hover:bg-[#1c222b] text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 border border-slate-200 dark:border-[#232a35] hover:border-slate-300 dark:hover:border-[#353f4e] transition-all shadow-2xs active:scale-95 disabled:opacity-50"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              Auto-Arrange (BUY 1st)
            </button>
          )}

          {/* Analyze & Subscribe Action Button (Icon with Tooltip opening on Top) */}
          {onAnalyze && (
            <div className="relative group flex items-center">
              <button
                type="button"
                onClick={onAnalyze}
                disabled={disabled || isLoading}
                className="px-2.5 py-1.5 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25 border border-indigo-500/50 transition-all active:scale-95 disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : 'fill-current'}`} />
              </button>

              {/* Tooltip positioned strictly on TOP */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 whitespace-nowrap animate-in fade-in duration-150">
                <div className="bg-slate-900 dark:bg-[#0d1117] text-white text-[10px] font-semibold py-1 px-2.5 rounded-md border border-slate-700 dark:border-[#333d4d] shadow-2xl">
                  {isLoading ? 'Subscribing & Streaming...' : 'Analyze & Subscribe'}
                </div>
                <div className="w-2 h-2 bg-slate-900 dark:bg-[#0d1117] border-r border-b border-slate-700 dark:border-[#333d4d] rotate-45 -mt-1"></div>
              </div>
            </div>
          )}

          {/* Add Leg Button */}
          <button
            type="button"
            onClick={handleAddLeg}
            disabled={disabled}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/15 dark:hover:bg-indigo-600/25 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Leg
          </button>
        </div>
      </div>

      {legs.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-200 dark:border-[#232a35] rounded-lg bg-slate-50/50 dark:bg-[#0d1117]/50">
          <p className="text-xs text-slate-500 dark:text-slate-400">No strategy legs configured.</p>
          <button
            onClick={handleAddLeg}
            className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-semibold"
          >
            + Add Leg to Start
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#232a35] text-[11px] uppercase tracking-wider">
                <th className="pb-2.5 font-semibold text-slate-400 dark:text-slate-500 pl-2 w-6 text-center"></th>
                <th className="pb-2.5 font-semibold text-slate-400 dark:text-slate-500 w-7">#</th>
                <th className="pb-2.5 font-semibold">Side</th>
                <th className="pb-2.5 font-semibold">Segment</th>
                <th className="pb-2.5 font-semibold">Instrument ID</th>
                <th className="pb-2.5 font-semibold">Lots</th>
                <th className="pb-2.5 font-semibold text-cyan-600 dark:text-cyan-300">Live LTP</th>
                <th className="pb-2.5 font-semibold">Entry Price (₹)</th>
                <th className="pb-2.5 text-right font-semibold pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1c222b] font-mono">
              {legs.map((leg, index) => (
                <LegRow
                  key={index}
                  leg={leg}
                  index={index}
                  disabled={disabled}
                  liveLtp={livePrices[leg.exchange_instrument_id]}
                  onUpdateLeg={handleUpdateLeg}
                  onRemoveLeg={handleRemoveLeg}
                  isDragging={draggedIndex === index}
                  isDropTarget={dropTargetIndex === index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

