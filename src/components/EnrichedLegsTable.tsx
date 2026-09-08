import React from 'react';
import { LiveLegUpdate } from '../types/strategy';
import { Table } from 'lucide-react';

interface EnrichedLegsTableProps {
  legs?: LiveLegUpdate[];
  livePrices?: Record<number, number>;
}

export const EnrichedLegsTable: React.FC<EnrichedLegsTableProps> = ({
  legs,
}) => {
  if (!legs || legs.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Enriched Contracts & Greeks Breakdown
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0d1117] px-2 py-0.5 rounded border border-slate-200 dark:border-[#232a35]">
          Greeks per 1 Share (Unit)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#232a35] text-[10px] uppercase tracking-wider">
              <th className="pb-2.5 font-semibold text-slate-400 dark:text-slate-500 pl-2 w-8">#</th>
              <th className="pb-2.5 font-semibold">Symbol</th>
              <th className="pb-2.5 font-semibold">Type</th>
              <th className="pb-2.5 font-semibold">Side</th>
              <th className="pb-2.5 font-semibold">Expiry</th>
              <th className="pb-2.5 font-semibold">Strike</th>
              <th className="pb-2.5 font-semibold">Qty</th>
              <th className="pb-2.5 font-semibold" title="Implied Volatility">IV %</th>
              <th className="pb-2.5 font-semibold" title="Delta per 1 share">Delta (Unit)</th>
              <th className="pb-2.5 font-semibold" title="Gamma per 1 share">Gamma (Unit)</th>
              <th className="pb-2.5 font-semibold" title="Theta decay per 1 share per day">Theta (₹/share)</th>
              <th className="pb-2.5 font-semibold" title="Vega sensitivity per 1 share">Vega (₹/share)</th>
              <th className="pb-2.5 text-right font-semibold pr-2">Cash Flow / P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#232a35] font-mono">
            {legs.map((leg, idx) => {
              const isBuy = leg.side === 'BUY';
              const legCashFlow = leg.premium !== undefined ? leg.premium : (leg.pnl !== undefined ? leg.pnl : 0);

              return (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#151C2A]/60 transition">
                  <td className="py-2.5 text-slate-400 dark:text-slate-500 w-8 pl-2 font-bold">
                    {leg.leg_index ?? idx + 1}
                  </td>
                  <td className="py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                    {leg.trading_symbol || leg.name || `ID: ${leg.exchange_instrument_id}`}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        leg.option_type === 'CE'
                          ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/25'
                          : leg.option_type === 'PE'
                          ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {leg.option_type || '—'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        isBuy
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25'
                          : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/25'
                      }`}
                    >
                      {leg.side}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-600 dark:text-slate-400">{leg.expiry || '—'}</td>
                  <td className="py-2.5 text-slate-900 dark:text-slate-200 font-bold">
                    {leg.strike > 0 ? `₹${leg.strike.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">
                    {leg.quantity}{' '}
                    <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                      ({leg.lots} {leg.lot_size ? `× ${leg.lot_size}` : 'lots'})
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                    {leg.iv_percent ? `${leg.iv_percent.toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2.5 text-slate-900 dark:text-slate-200 font-medium">
                    {leg.greeks?.delta !== undefined
                      ? (leg.greeks.delta >= 0 ? `+${leg.greeks.delta.toFixed(3)}` : leg.greeks.delta.toFixed(3))
                      : '—'}
                  </td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">
                    {leg.greeks?.gamma !== undefined ? leg.greeks.gamma.toFixed(4) : '—'}
                  </td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">
                    {leg.greeks?.theta !== undefined ? leg.greeks.theta.toFixed(2) : '—'}
                  </td>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">
                    {leg.greeks?.vega !== undefined ? leg.greeks.vega.toFixed(2) : '—'}
                  </td>
                  <td
                    className={`py-2.5 text-right font-bold pr-2 ${
                      legCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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
