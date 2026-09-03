import React from 'react';
import { LiveLegUpdate } from '../types/strategy';
import { Table } from 'lucide-react';

interface EnrichedLegsTableProps {
  legs?: LiveLegUpdate[];
  livePrices?: Record<number, number>;
}

export const EnrichedLegsTable: React.FC<EnrichedLegsTableProps> = ({
  legs,
  livePrices = {},
}) => {
  if (!legs || legs.length === 0) return null;

  return (
    <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Table className="w-4 h-4 text-indigo-400" />
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Enriched Contracts & Greeks Breakdown
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-[#2d3239] text-[10px] uppercase tracking-wider">
              <th className="pb-2.5 font-semibold pl-2">Symbol</th>
              <th className="pb-2.5 font-semibold">Type</th>
              <th className="pb-2.5 font-semibold">Side</th>
              <th className="pb-2.5 font-semibold">Expiry</th>
              <th className="pb-2.5 font-semibold">Strike</th>
              <th className="pb-2.5 font-semibold">Qty</th>
              <th className="pb-2.5 font-semibold">Entry Px</th>
              <th className="pb-2.5 font-semibold">LTP</th>
              <th className="pb-2.5 font-semibold">IV %</th>
              <th className="pb-2.5 font-semibold">Delta</th>
              <th className="pb-2.5 font-semibold">Theta</th>
              <th className="pb-2.5 text-right font-semibold pr-2">Cash Flow / P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262a31] font-mono">
            {legs.map((leg, idx) => {
              const isBuy = leg.side === 'BUY';
              const livePrice = livePrices[leg.exchange_instrument_id] || leg.ltp || leg.price;
              const legCashFlow = leg.premium !== undefined ? leg.premium : (leg.pnl !== undefined ? leg.pnl : 0);

              return (
                <tr key={idx} className="hover:bg-[#151C2A]/60 transition">
                  <td className="py-2.5 font-semibold text-slate-100 pl-2">
                    {leg.trading_symbol || leg.name || `ID: ${leg.exchange_instrument_id}`}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        leg.option_type === 'CE'
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/25'
                          : leg.option_type === 'PE'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {leg.option_type || '—'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isBuy
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {leg.side}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400">{leg.expiry || '—'}</td>
                  <td className="py-2.5 text-slate-200 font-bold">
                    {leg.strike > 0 ? `₹${leg.strike}` : '—'}
                  </td>
                  <td className="py-2.5 text-slate-300">
                    {leg.quantity}{' '}
                    <span className="text-slate-500 text-[10px]">
                      ({leg.lots} {leg.lot_size ? `× ${leg.lot_size}` : 'lots'})
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-300">
                    ₹{leg.entry_price?.toFixed(2) || '0.00'}
                  </td>
                  <td className="py-2.5 text-cyan-300 font-bold">
                    {livePrice ? `₹${livePrice.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2.5 text-amber-300">
                    {leg.iv_percent ? `${leg.iv_percent.toFixed(1)}%` : '—'}
                  </td>
                  <td
                    className={`py-2.5 ${
                      (leg.greeks?.delta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {leg.greeks?.delta !== undefined ? leg.greeks.delta.toFixed(3) : '—'}
                  </td>
                  <td className="py-2.5 text-rose-400">
                    {leg.greeks?.theta !== undefined ? `₹${leg.greeks.theta.toFixed(1)}` : '—'}
                  </td>
                  <td
                    className={`py-2.5 text-right font-bold pr-2 ${
                      legCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {legCashFlow >= 0
                      ? `+₹${legCashFlow.toLocaleString('en-IN')}`
                      : `-₹${Math.abs(legCashFlow).toLocaleString('en-IN')}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
