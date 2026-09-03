import React, { useState, useRef, useMemo } from 'react';
import { PayoffResult, PortfolioGreeks } from '../types/strategy';
import {
  LineChart as ChartIcon,
  ShieldCheck,
  Sliders,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Table as TableIcon,
  BarChart2,
  Percent,
  Sigma,
} from 'lucide-react';

interface PayoffChartProps {
  payoff?: PayoffResult;
  spotPrice: number;
  greeks?: PortfolioGreeks;
}

export const PayoffChart: React.FC<PayoffChartProps> = ({ payoff, spotPrice, greeks }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // View Mode: 'chart' (Graph) or 'table' (Sensibull-style Payoff Table)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Toggle layer states
  const [showTargetDate, setShowTargetDate] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showBreakEvens, setShowBreakEvens] = useState(true);
  const [showSD, setShowSD] = useState(true);

  // Hover data for mouse crosshair
  const [hoverData, setHoverData] = useState<{
    spot: number;
    expiryPnL: number;
    targetPnL?: number;
    x: number;
    y: number;
  } | null>(null);

  // Simulated spot slider state
  const [simulatedSpot, setSimulatedSpot] = useState<number | null>(null);

  // SVG Dimensions
  const width = 850;
  const height = 360;
  const padding = { top: 35, right: 35, bottom: 45, left: 70 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Process data points, Standard Deviations, and extrema
  const {
    points,
    minSpot,
    maxSpot,
    minPnL,
    maxPnL,
    zeroY,
    breakEvens,
    sd1Low,
    sd1High,
    sd2Low,
    sd2High,
  } = useMemo(() => {
    if (!payoff?.payoff_at_expiry || payoff.payoff_at_expiry.length === 0) {
      return {
        points: [],
        minSpot: 0,
        maxSpot: 0,
        minPnL: 0,
        maxPnL: 0,
        zeroY: 0,
        breakEvens: [],
        sd1Low: 0,
        sd1High: 0,
        sd2Low: 0,
        sd2High: 0,
      };
    }

    const pts = payoff.payoff_at_expiry.map((pt, i) => {
      const tgt = payoff.payoff_at_target && payoff.payoff_at_target[i];
      return {
        spot: pt.spot,
        expiryPnL: pt.pnl,
        targetPnL: tgt ? tgt.pnl : undefined,
      };
    });

    pts.sort((a, b) => a.spot - b.spot);

    const spots = pts.map((p) => p.spot);
    const pnls = pts.flatMap((p) =>
      p.targetPnL !== undefined ? [p.expiryPnL, p.targetPnL] : [p.expiryPnL]
    );

    const minS = Math.min(...spots);
    const maxS = Math.max(...spots);
    let minP = Math.min(...pnls, 0);
    let maxP = Math.max(...pnls, 0);

    // Padding for Y axis
    const pnlRange = maxP - minP || 1000;
    minP -= pnlRange * 0.12;
    maxP += pnlRange * 0.12;

    const zY = padding.top + plotHeight * (1 - (0 - minP) / (maxP - minP));

    const bes = Array.isArray(payoff.break_evens)
      ? payoff.break_evens.map((b: any) => (typeof b === 'number' ? b : b.spot))
      : [];

    // Sensibull Standard Deviation Calculation (1 SD = 68.2%, 2 SD = 95.4%)
    const iv = (greeks?.implied_vol && greeks.implied_vol > 0) ? greeks.implied_vol : 0.15;
    const daysToExpiry = 7; // Typical weekly baseline or ~0.019 years
    const sdMove = spotPrice > 0 ? spotPrice * iv * Math.sqrt(daysToExpiry / 365) : (maxS - minS) * 0.08;

    return {
      points: pts,
      minSpot: minS,
      maxSpot: maxS,
      minPnL: minP,
      maxPnL: maxP,
      zeroY: zY,
      breakEvens: bes,
      sd1Low: spotPrice > 0 ? Math.round(spotPrice - sdMove) : 0,
      sd1High: spotPrice > 0 ? Math.round(spotPrice + sdMove) : 0,
      sd2Low: spotPrice > 0 ? Math.round(spotPrice - 2 * sdMove) : 0,
      sd2High: spotPrice > 0 ? Math.round(spotPrice + 2 * sdMove) : 0,
    };
  }, [payoff, spotPrice, greeks]);

  if (!payoff?.payoff_at_expiry || payoff.payoff_at_expiry.length === 0 || points.length === 0) {
    return (
      <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-8 h-80 flex flex-col items-center justify-center text-slate-500">
        <ChartIcon className="w-10 h-10 mb-3 opacity-30 text-indigo-400" />
        <p className="text-sm font-medium text-slate-400">No Payoff Data Available</p>
        <p className="text-xs text-slate-500 mt-1">
          Click <span className="text-indigo-400 font-semibold">"Analyze & Subscribe"</span> to calculate payoff curves.
        </p>
      </div>
    );
  }

  // Active Spot (either hovered, simulated, or live)
  const activeSpot = hoverData?.spot || simulatedSpot || spotPrice;

  // Coordinate conversion
  const getX = (spot: number) => {
    if (maxSpot === minSpot) return padding.left + plotWidth / 2;
    return padding.left + ((spot - minSpot) / (maxSpot - minSpot)) * plotWidth;
  };

  const getY = (pnl: number) => {
    if (maxPnL === minPnL) return padding.top + plotHeight / 2;
    return padding.top + plotHeight * (1 - (pnl - minPnL) / (maxPnL - minPnL));
  };

  // Build SVG Paths
  const buildPath = (key: 'expiryPnL' | 'targetPnL') => {
    let d = '';
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const val = p[key];
      if (val === undefined) continue;
      const x = getX(p.spot);
      const y = getY(val);
      if (d === '') {
        d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      } else {
        d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    return d;
  };

  const expiryLine = buildPath('expiryPnL');
  const targetLine = buildPath('targetPnL');

  const firstX = getX(points[0].spot);
  const lastX = getX(points[points.length - 1].spot);
  const expiryAreaPath = `${expiryLine} L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} L ${firstX.toFixed(1)} ${zeroY.toFixed(1)} Z`;

  // X Ticks
  const xTicks = [];
  const xCount = 6;
  const xStep = (maxSpot - minSpot) / (xCount - 1);
  for (let i = 0; i < xCount; i++) {
    const s = Math.round(minSpot + i * xStep);
    xTicks.push({ spot: s, x: getX(s) });
  }

  // Y Ticks
  const yTicks = [];
  const yCount = 5;
  const yStep = (maxPnL - minPnL) / (yCount - 1);
  for (let i = 0; i < yCount; i++) {
    const pnlVal = Math.round(minPnL + i * yStep);
    yTicks.push({ pnl: pnlVal, y: getY(pnlVal) });
  }

  // Mouse Move Handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = (mouseX / rect.width) * width;

    const spotVal = minSpot + ((relX - padding.left) / plotWidth) * (maxSpot - minSpot);

    let closest = points[0];
    let minDiff = Math.abs(points[0].spot - spotVal);
    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].spot - spotVal);
      if (diff < minDiff) {
        minDiff = diff;
        closest = points[i];
      }
    }

    if (closest) {
      setHoverData({
        spot: closest.spot,
        expiryPnL: closest.expiryPnL,
        targetPnL: closest.targetPnL,
        x: getX(closest.spot),
        y: getY(closest.expiryPnL),
      });
    }
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // Coordinates for key markers
  const spotX = spotPrice > 0 ? getX(spotPrice) : null;
  const simulatedX = simulatedSpot ? getX(simulatedSpot) : null;
  const simulatedPoint = simulatedSpot
    ? points.find((p) => Math.abs(p.spot - simulatedSpot) <= (maxSpot - minSpot) / (points.length * 2)) || points[0]
    : null;

  // Standard Deviation coordinates (1 SD = 68.2%, 2 SD = 95.4%)
  const sd1LowX = sd1Low > minSpot ? getX(sd1Low) : null;
  const sd1HighX = sd1High < maxSpot ? getX(sd1High) : null;
  const sd2LowX = sd2Low > minSpot ? getX(sd2Low) : null;
  const sd2HighX = sd2High < maxSpot ? getX(sd2High) : null;

  // Strategy Narrative Explanation Builder
  const getNarrative = () => {
    if (breakEvens.length === 1) {
      const be = breakEvens[0];
      const isAboveProfit = points[points.length - 1].expiryPnL > 0;
      if (isAboveProfit) {
        return `Profitable when underlying rises above ₹${be.toLocaleString('en-IN')} (Break-Even). Max loss capped at ₹${Math.abs(payoff.max_loss || 0).toLocaleString('en-IN')}.`;
      } else {
        return `Profitable when underlying drops below ₹${be.toLocaleString('en-IN')} (Break-Even). Max loss capped at ₹${Math.abs(payoff.max_loss || 0).toLocaleString('en-IN')}.`;
      }
    } else if (breakEvens.length >= 2) {
      const isRangeBound = (points.find((p) => p.spot > breakEvens[0] && p.spot < breakEvens[1])?.expiryPnL ?? 0) > 0;
      if (isRangeBound) {
        return `Range Strategy: Profitable between ₹${breakEvens[0].toLocaleString('en-IN')} and ₹${breakEvens[1].toLocaleString('en-IN')} at expiry.`;
      } else {
        return `Breakout Strategy: Profitable outside ₹${breakEvens[0].toLocaleString('en-IN')} or ₹${breakEvens[1].toLocaleString('en-IN')} at expiry.`;
      }
    }
    return `Interactive payoff chart showing profit & loss zones across underlying spot prices.`;
  };

  return (
    <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl p-4 shadow-sm relative overflow-hidden space-y-3.5">
      {/* 1. Top Control Bar: View Switcher (Chart vs Table), SD Toggle, and Layers */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#2d3239]">
        <div className="flex items-center gap-2">
          {/* Sensibull-style View Mode Switcher */}
          <div className="flex items-center bg-[#141619] p-0.5 rounded-lg border border-[#282d34]">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-semibold transition ${
                viewMode === 'chart'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Payoff Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Payoff Table
            </button>
          </div>

          {/* Probability of Profit Badge */}
          {payoff.pop !== undefined && payoff.pop > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/25">
              <Percent className="w-3 h-3" /> POP:{' '}
              {(payoff.pop <= 1 ? payoff.pop * 100 : payoff.pop).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Layer Toggles & Sensibull SD Overlay Control */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#141619] px-2 py-0.5 rounded-lg border border-[#282d34]">
            <Layers className="w-3 h-3 text-slate-400" />
            <button
              onClick={() => setShowSD(!showSD)}
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 transition ${
                showSD ? 'bg-indigo-600/30 text-indigo-300 font-bold' : 'text-slate-500'
              }`}
            >
              <Sigma className="w-2.5 h-2.5" />
              1 SD Band
            </button>
            <button
              onClick={() => setShowZones(!showZones)}
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                showZones ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-500'
              }`}
            >
              Zones
            </button>
            <button
              onClick={() => setShowBreakEvens(!showBreakEvens)}
              className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                showBreakEvens ? 'bg-amber-500/30 text-amber-300 font-bold' : 'text-slate-500'
              }`}
            >
              BE
            </button>
            {targetLine && (
              <button
                onClick={() => setShowTargetDate(!showTargetDate)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium transition ${
                  showTargetDate ? 'bg-amber-400/30 text-amber-300 font-bold' : 'text-slate-500'
                }`}
              >
                Target (T+N)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Self-Explaining Strategy Narrative Callout */}
      <div className="bg-[#141619] border border-[#282d34] rounded-lg px-3 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{getNarrative()}</span>
        </div>
        {sd1Low > 0 && sd1High > 0 && (
          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-slate-400">
            <span>Expected 1 SD Range:</span>
            <span className="text-white font-bold">₹{sd1Low.toLocaleString('en-IN')} – ₹{sd1High.toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* 3. Main View: Payoff Chart OR Payoff Table */}
      {viewMode === 'chart' ? (
        <div
          ref={containerRef}
          className="relative w-full rounded-lg overflow-hidden border border-[#2d3239] bg-[#1e2124] shadow-inner"
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto cursor-crosshair select-none block"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Profit Green Gradient */}
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>

              {/* Loss Red Gradient */}
              <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.45" />
              </linearGradient>

              {/* Clip path for Profit Zone */}
              <clipPath id="clipProfit">
                <rect x={padding.left} y={padding.top} width={plotWidth} height={Math.max(0, zeroY - padding.top)} />
              </clipPath>

              {/* Clip path for Loss Zone */}
              <clipPath id="clipLoss">
                <rect x={padding.left} y={zeroY} width={plotWidth} height={Math.max(0, height - padding.bottom - zeroY)} />
              </clipPath>
            </defs>

            {/* Sensibull 1 Standard Deviation (68.2% Probability Band) */}
            {showSD && sd1LowX !== null && sd1HighX !== null && (
              <g className="pointer-events-none select-none">
                <rect
                  x={Math.max(padding.left, sd1LowX)}
                  y={padding.top}
                  width={Math.min(width - padding.right, sd1HighX) - Math.max(padding.left, sd1LowX)}
                  height={plotHeight}
                  fill="#6366f1"
                  fillOpacity="0.06"
                />
                <line
                  x1={sd1LowX}
                  y1={padding.top}
                  x2={sd1LowX}
                  y2={height - padding.bottom}
                  stroke="#6366f1"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                  opacity="0.5"
                />
                <line
                  x1={sd1HighX}
                  y1={padding.top}
                  x2={sd1HighX}
                  y2={height - padding.bottom}
                  stroke="#6366f1"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                  opacity="0.5"
                />
                {/* 2 SD outer reference lines */}
                {sd2LowX !== null && (
                  <line
                    x1={sd2LowX}
                    y1={padding.top}
                    x2={sd2LowX}
                    y2={height - padding.bottom}
                    stroke="#6366f1"
                    strokeDasharray="1 5"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                )}
                {sd2HighX !== null && (
                  <line
                    x1={sd2HighX}
                    y1={padding.top}
                    x2={sd2HighX}
                    y2={height - padding.bottom}
                    stroke="#6366f1"
                    strokeDasharray="1 5"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                )}
                <text
                  x={(sd1LowX + sd1HighX) / 2}
                  y={padding.top + 14}
                  fill="#818cf8"
                  fillOpacity="0.4"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                  letterSpacing="0.05em"
                >
                  ◀ 68.2% PROBABILITY (1 SD) ▶
                </text>
              </g>
            )}

            {/* Background Explanatory Watermarks */}
            {showZones && (
              <g className="pointer-events-none select-none">
                {zeroY > padding.top + 30 && (
                  <text
                    x={padding.left + 20}
                    y={padding.top + 28}
                    fill="#10b981"
                    fillOpacity="0.18"
                    fontSize="13"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    letterSpacing="0.1em"
                  >
                    ▲ PROFIT ZONE (₹ &gt; 0)
                  </text>
                )}
                {zeroY < height - padding.bottom - 20 && (
                  <text
                    x={padding.left + 20}
                    y={height - padding.bottom - 15}
                    fill="#ef4444"
                    fillOpacity="0.18"
                    fontSize="13"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    letterSpacing="0.1em"
                  >
                    ▼ LOSS ZONE (₹ &lt; 0)
                  </text>
                )}
              </g>
            )}

            {/* Grid Lines & Labels */}
            {yTicks.map((yt, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={yt.y}
                  x2={width - padding.right}
                  y2={yt.y}
                  stroke="#2e333b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={yt.y + 4}
                  fill="#8590a2"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  {yt.pnl >= 0 ? '+' : ''}₹{(yt.pnl / 1000).toFixed(0)}k
                </text>
              </g>
            ))}

            {xTicks.map((xt, i) => (
              <g key={i}>
                <line
                  x1={xt.x}
                  y1={padding.top}
                  x2={xt.x}
                  y2={height - padding.bottom}
                  stroke="#2e333b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={xt.x}
                  y={height - padding.bottom + 18}
                  fill="#8590a2"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  ₹{xt.spot.toLocaleString('en-IN')}
                </text>
              </g>
            ))}

            {/* Axis Labels (X & Y Titles) */}
            <text
              transform="rotate(-90)"
              x={-(padding.top + plotHeight / 2)}
              y={18}
              fill="#8590a2"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              letterSpacing="0.08em"
              fontFamily="sans-serif"
            >
              NET P&L (₹)
            </text>

            <text
              x={padding.left + plotWidth / 2}
              y={height - 6}
              fill="#8590a2"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              letterSpacing="0.08em"
              fontFamily="sans-serif"
            >
              UNDERLYING SPOT PRICE (₹) →
            </text>

            {/* Shaded Profit & Loss Areas */}
            {showZones && (
              <>
                <path d={expiryAreaPath} fill="url(#profitFill)" clipPath="url(#clipProfit)" />
                <path d={expiryAreaPath} fill="url(#lossFill)" clipPath="url(#clipLoss)" />
              </>
            )}

            {/* Zero P&L Reference Axis Line */}
            <line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke="#4e5561"
              strokeWidth="1.5"
            />
            <text
              x={width - padding.right + 6}
              y={zeroY + 3}
              fill="#a1abb9"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
            >
              ₹0
            </text>

            {/* Break-Even Vertical Marker Lines & Callout Badges */}
            {showBreakEvens &&
              breakEvens.map((be, i) => {
                const beX = getX(be);
                if (beX < padding.left || beX > width - padding.right) return null;
                return (
                  <g key={i}>
                    <line
                      x1={beX}
                      y1={padding.top}
                      x2={beX}
                      y2={height - padding.bottom}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <circle cx={beX} cy={zeroY} r="4" fill="#f59e0b" stroke="#1e2124" strokeWidth="2" />
                    <g transform={`translate(${beX - 26}, ${padding.top - 18})`}>
                      <rect width="52" height="15" rx="3" fill="#f59e0b" />
                      <text x="26" y="11" fill="#1e2124" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                        BE ₹{be.toFixed(0)}
                      </text>
                    </g>
                  </g>
                );
              })}

            {/* Current Live Spot Vertical Line */}
            {spotX !== null && spotX >= padding.left && spotX <= width - padding.right && (
              <g>
                <line
                  x1={spotX}
                  y1={padding.top}
                  x2={spotX}
                  y2={height - padding.bottom}
                  stroke="#6366f1"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
                <circle
                  cx={spotX}
                  cy={getY(points.find((p) => Math.abs(p.spot - spotPrice) < 50)?.expiryPnL || 0)}
                  r="4.5"
                  fill="#6366f1"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <g transform={`translate(${spotX - 34}, ${height - padding.bottom + 26})`}>
                  <rect width="68" height="15" rx="3" fill="#6366f1" />
                  <text x="34" y="11" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    Live ₹{spotPrice.toFixed(0)}
                  </text>
                </g>
              </g>
            )}

            {/* Simulated Spot Price Marker */}
            {simulatedX !== null && simulatedPoint && simulatedX >= padding.left && simulatedX <= width - padding.right && (
              <g>
                <line
                  x1={simulatedX}
                  y1={padding.top}
                  x2={simulatedX}
                  y2={height - padding.bottom}
                  stroke="#a855f7"
                  strokeDasharray="3 3"
                  strokeWidth="1.5"
                />
                <circle
                  cx={simulatedX}
                  cy={getY(simulatedPoint.expiryPnL)}
                  r="5"
                  fill="#a855f7"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <g transform={`translate(${simulatedX - 36}, ${padding.top - 18})`}>
                  <rect width="72" height="16" rx="4" fill="#a855f7" />
                  <text x="36" y="11.5" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    Sim ₹{simulatedSpot?.toFixed(0)}
                  </text>
                </g>
              </g>
            )}

            {/* Target Date (T+N) Line (Dashed Amber) */}
            {showTargetDate && targetLine && (
              <path
                d={targetLine}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
            )}

            {/* Main Expiry Payoff Curve (Solid Cyan) */}
            <path
              d={expiryLine}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Mouse Hover Crosshair with Sensibull-style Dual Snapping Dots */}
            {hoverData && (
              <g>
                {/* Vertical Spot Alignment Line */}
                <line
                  x1={hoverData.x}
                  y1={padding.top}
                  x2={hoverData.x}
                  y2={height - padding.bottom}
                  stroke="#a855f7"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                {/* Horizontal P&L Alignment Line */}
                <line
                  x1={padding.left}
                  y1={hoverData.y}
                  x2={width - padding.right}
                  y2={hoverData.y}
                  stroke="#a855f7"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />

                {/* Expiry Curve Snapping Dot (Cyan) */}
                <circle
                  cx={hoverData.x}
                  cy={hoverData.y}
                  r="5"
                  fill="#06b6d4"
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Target Date (T+N) Curve Snapping Dot (Amber) */}
                {showTargetDate && hoverData.targetPnL !== undefined && (
                  <circle
                    cx={hoverData.x}
                    cy={getY(hoverData.targetPnL)}
                    r="5"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                )}
              </g>
            )}
          </svg>

          {/* 4. Self-Explaining Interactive Tooltip HUD */}
          {hoverData && (
            <div
              className="absolute z-20 pointer-events-none bg-[#141619]/95 border border-[#3b414b] p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md transition-all duration-75"
              style={{
                left: `${Math.min(
                  Math.max(12, (hoverData.x / width) * 100),
                  74
                )}%`,
                top: '14px',
              }}
            >
              <div className="text-slate-300 font-mono text-[11px] border-b border-[#2d3239] pb-1.5 mb-2 flex items-center justify-between gap-4 font-bold">
                <span>Target Spot:</span>
                <span className="text-white font-mono flex items-center gap-1.5">
                  ₹{hoverData.spot.toLocaleString('en-IN')}
                  {spotPrice > 0 && (
                    <span
                      className={`text-[10px] font-normal ${
                        hoverData.spot >= spotPrice ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ({hoverData.spot >= spotPrice ? '+' : ''}
                      {(((hoverData.spot - spotPrice) / spotPrice) * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                {/* Expiry P&L */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-cyan-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    Expiry P&L:
                  </span>
                  <span
                    className={`font-bold ${
                      hoverData.expiryPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {hoverData.expiryPnL >= 0 ? '+₹' : '-₹'}
                    {Math.abs(Math.round(hoverData.expiryPnL)).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Target Date P&L */}
                {showTargetDate && hoverData.targetPnL !== undefined && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-amber-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      Target (T+N) P&L:
                    </span>
                    <span
                      className={`font-bold ${
                        hoverData.targetPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {hoverData.targetPnL >= 0 ? '+₹' : '-₹'}
                      {Math.abs(Math.round(hoverData.targetPnL)).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Theta / Time Value Gap */}
                {showTargetDate && hoverData.targetPnL !== undefined && (
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-[#262a31] text-[10px] text-slate-400">
                    <span>Time Value / Theta Gap:</span>
                    <span
                      className={`font-bold font-mono ${
                        hoverData.targetPnL - hoverData.expiryPnL >= 0
                          ? 'text-emerald-300'
                          : 'text-rose-300'
                      }`}
                    >
                      {hoverData.targetPnL - hoverData.expiryPnL >= 0 ? '+₹' : '-₹'}
                      {Math.abs(Math.round(hoverData.targetPnL - hoverData.expiryPnL)).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Outcome Badge */}
              <div className="mt-2 pt-1.5 border-t border-[#262a31] text-[10px] font-sans flex items-center gap-1">
                {hoverData.expiryPnL > 0 ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300">In Profit: strategy gains if expired here.</span>
                  </>
                ) : hoverData.expiryPnL < 0 ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                    <span className="text-rose-300">In Loss: strategy loses if expired here.</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="text-amber-300">Break-Even crossover.</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Sensibull-style Payoff Table View */
        <div className="rounded-lg border border-[#2d3239] bg-[#1e2124] overflow-hidden max-h-[360px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-[#141619] border-b border-[#2d3239] text-[10px] uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Spot Target</th>
                <th className="py-2.5 px-3">% Move</th>
                <th className="py-2.5 px-3 text-amber-400">Target (T+N) P&L</th>
                <th className="py-2.5 px-3 text-cyan-300">Expiry P&L</th>
                <th className="py-2.5 px-3">Probability Zone</th>
                <th className="py-2.5 px-3 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262a31]">
              {points
                .filter((_, idx) => idx % 3 === 0 || idx === points.length - 1)
                .map((p, i) => {
                  const isCurrent = Math.abs(p.spot - spotPrice) < (maxSpot - minSpot) / (points.length * 2);
                  const pctMove = spotPrice > 0 ? ((p.spot - spotPrice) / spotPrice) * 100 : 0;
                  const in1SD = sd1Low > 0 && p.spot >= sd1Low && p.spot <= sd1High;

                  return (
                    <tr
                      key={i}
                      className={`hover:bg-[#25282e] transition ${
                        isCurrent ? 'bg-indigo-600/10 font-bold border-l-2 border-indigo-500' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-slate-100 flex items-center gap-1.5">
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>}
                        ₹{p.spot.toLocaleString('en-IN')}
                      </td>
                      <td
                        className={`py-2 px-3 ${
                          pctMove > 0 ? 'text-emerald-400' : pctMove < 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {pctMove >= 0 ? '+' : ''}
                        {pctMove.toFixed(1)}%
                      </td>
                      <td
                        className={`py-2 px-3 font-semibold ${
                          (p.targetPnL ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {p.targetPnL !== undefined ? (
                          <>
                            {p.targetPnL >= 0 ? '+₹' : '-₹'}
                            {Math.abs(Math.round(p.targetPnL)).toLocaleString('en-IN')}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        className={`py-2 px-3 font-bold ${
                          p.expiryPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {p.expiryPnL >= 0 ? '+₹' : '-₹'}
                        {Math.abs(Math.round(p.expiryPnL)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-[10px]">
                        {in1SD ? (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                            Within 1 SD (68%)
                          </span>
                        ) : (
                          <span className="text-slate-500">Outlier / 2 SD</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {p.expiryPnL > 0 ? (
                          <span className="text-emerald-400 text-[10px] font-bold">PROFIT</span>
                        ) : p.expiryPnL < 0 ? (
                          <span className="text-rose-400 text-[10px] font-bold">LOSS</span>
                        ) : (
                          <span className="text-amber-400 text-[10px] font-bold">BE</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. What-If Spot Price Simulation Slider & Quick Buttons */}
      <div className="bg-[#141619] border border-[#282d34] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-300">Simulate Spot Move:</span>
          <span className="font-mono font-bold text-indigo-300">
            ₹{activeSpot.toLocaleString('en-IN')}
          </span>
          {spotPrice > 0 && (
            <span
              className={`text-[11px] font-mono ${
                activeSpot >= spotPrice ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ({activeSpot >= spotPrice ? '+' : ''}
              {(((activeSpot - spotPrice) / spotPrice) * 100).toFixed(1)}%)
            </span>
          )}
        </div>

        {/* Quick Simulation Buttons */}
        <div className="flex items-center gap-1.5">
          {[-5, -2, 0, 2, 5].map((pct) => {
            const target = spotPrice * (1 + pct / 100);
            return (
              <button
                key={pct}
                type="button"
                onClick={() => setSimulatedSpot(pct === 0 ? null : Math.round(target))}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border transition ${
                  (pct === 0 && simulatedSpot === null) || simulatedSpot === Math.round(target)
                    ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                    : 'bg-[#1e2124] text-slate-400 border-[#2d3239] hover:text-slate-200'
                }`}
              >
                {pct === 0 ? 'Live Spot' : `${pct > 0 ? '+' : ''}${pct}%`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
