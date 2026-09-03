import React from 'react';
import { PortfolioGreeks } from '../types/strategy';
import { Sparkles } from 'lucide-react';

interface GreeksCardProps {
  greeks?: PortfolioGreeks;
}

export const GreeksCard: React.FC<GreeksCardProps> = ({ greeks }) => {
  if (!greeks) return null;

  const greekItems = [
    {
      name: 'Delta (Δ)',
      value: greeks.delta !== undefined ? greeks.delta.toFixed(2) : '0.00',
      desc: 'Directional bias',
      color: (greeks.delta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400',
    },
    {
      name: 'Gamma (Γ)',
      value: greeks.gamma !== undefined ? greeks.gamma.toFixed(4) : '0.0000',
      desc: 'Delta acceleration',
      color: 'text-indigo-300',
    },
    {
      name: 'Theta (Θ)',
      value: greeks.theta !== undefined ? `₹${greeks.theta.toFixed(1)}` : '0.0',
      desc: 'Decay per day',
      color: (greeks.theta || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400',
    },
    {
      name: 'Vega (ν)',
      value: greeks.vega !== undefined ? `₹${greeks.vega.toFixed(1)}` : '0.0',
      desc: '1% IV movement',
      color: 'text-cyan-300',
    },
    {
      name: 'Rho (ρ)',
      value: greeks.rho !== undefined ? greeks.rho.toFixed(2) : '0.00',
      desc: 'Rate sensitivity',
      color: 'text-slate-300',
    },
    {
      name: 'Strategy IV',
      value: greeks.iv_percent ? `${greeks.iv_percent.toFixed(1)}%` : (greeks.implied_vol ? `${(greeks.implied_vol * 100).toFixed(1)}%` : '—'),
      desc: 'Weighted Volatility',
      color: 'text-amber-300',
    },
  ];

  return (
    <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Portfolio Greeks
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {greekItems.map((item, idx) => (
          <div
            key={idx}
            className="bg-[#141619] border border-[#282d34] rounded-lg p-2.5 flex flex-col justify-between"
          >
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{item.name}</div>
            <div className={`text-sm font-bold font-mono my-1 ${item.color}`}>
              {item.value}
            </div>
            <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
