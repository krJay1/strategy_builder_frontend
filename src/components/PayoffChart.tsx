import React, { useState, useRef, useMemo, useEffect } from 'react';
import { PayoffResult, PortfolioGreeks, LiveLegUpdate } from '../types/strategy';
import { useTheme } from '../context/ThemeContext';
import {
  LineChart as ChartIcon,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Table as TableIcon,
  BarChart2,
  Sigma,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  MoveHorizontal,
} from 'lucide-react';

interface PayoffChartProps {
  payoff?: PayoffResult;
  spotPrice: number;
  greeks?: PortfolioGreeks;
  livePnL?: number;
  totalValue?: number;
  legs?: LiveLegUpdate[];
}

// Sensibull-style Nice Y-Scale calculation anchored at 0
function calculateNiceYScale(minVal: number, maxVal: number) {
  const range = maxVal - minVal || 1000;
  // Aim for ~2.5 intervals so we get 3 to 4 ticks (e.g. 0, 5000, 10000)
  const roughStep = range / 2.5;
  const exponent = Math.floor(Math.log10(roughStep));
  const power = Math.pow(10, exponent);
  const fraction = roughStep / power;

  let multiplier = 1;
  if (fraction < 1.5) {
    multiplier = 1;
  } else if (fraction < 3.5) {
    multiplier = 2;
  } else if (fraction < 7.5) {
    multiplier = 5;
  } else {
    multiplier = 10;
  }

  let step = multiplier * power;
  step = Math.max(step, 100);

  // Determine tick bounds anchored at 0
  let minTick = 0;
  if (minVal < 0) {
    if (Math.abs(minVal) <= 0.25 * step) {
      // Small loss relative to step size (e.g. -633 loss vs 5000 step)
      // Anchor bottom tick at 0 to avoid wasting chart height on empty negative space
      minTick = 0;
    } else {
      minTick = Math.floor(minVal / step) * step;
    }
  }

  let maxTick = 0;
  if (maxVal > 0) {
    if (maxVal <= 0.25 * step) {
      // Small profit relative to step size
      maxTick = 0;
    } else {
      const ceilTick = Math.ceil(maxVal / step) * step;
      if (ceilTick - step >= 0 && maxVal - (ceilTick - step) <= 0.15 * step) {
        maxTick = ceilTick - step;
      } else {
        maxTick = ceilTick;
      }
    }
  }

  // Ensure at least 2 ticks and at least covers 0
  if (maxTick === minTick) {
    maxTick = minTick + step;
  }

  const ticks: number[] = [];
  for (let val = minTick; val <= maxTick + step * 0.01; val += step) {
    ticks.push(Math.round(val));
  }

  // Plot bounds with padding so curves don't clip at top/bottom tick edges
  let plotMinPnL = minTick;
  let plotMaxPnL = maxTick;

  if (minVal < minTick) {
    plotMinPnL = minTick - Math.max(Math.abs(minVal) * 1.35, step * 0.2);
  } else {
    plotMinPnL = minTick - step * 0.12;
  }

  if (maxVal > maxTick) {
    plotMaxPnL = maxTick + Math.max((maxVal - maxTick) * 1.35, step * 0.2);
  } else {
    plotMaxPnL = maxTick + step * 0.12;
  }

  return { step, minTick, maxTick, ticks, plotMinPnL, plotMaxPnL };
}

export const PayoffChart: React.FC<PayoffChartProps> = ({
  payoff,
  spotPrice,
  greeks,
  livePnL,
  totalValue,
  legs: _legs,
}) => {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  // View Mode: 'chart' (Graph) or 'table' (Sensibull-style Payoff Table)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  // Zoom Range: 'focus' (Sensibull standard strategy window) or 'full' (±15% dataset)
  const [zoomRange, setZoomRange] = useState<'focus' | 'full'>('focus');

  // Slide / Pan state (allows sliding the view horizontally across spot prices)
  const [panOffset, setPanOffset] = useState(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartPanRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Global mouseup listener to cleanly end dragging even outside the SVG
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

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

  // SVG Dimensions
  const width = 850;
  const height = 360;
  const padding = { top: 35, right: 35, bottom: 45, left: 70 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Process data points, Standard Deviations, and extrema
  const {
    points,
    allPoints,
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
    yTicks,
    xTicks,
    minPanOffset,
    maxPanOffset,
    dataMinS,
    dataMaxS,
    spotStep,
  } = useMemo(() => {
    const rawList = payoff?.payoff_at_expiry || payoff?.payoffs_at_expiry || [];
    const targetList = payoff?.payoff_at_target || payoff?.payoffs_at_target || [];

    if (rawList.length === 0) {
      return {
        points: [],
        allPoints: [],
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
        yTicks: [],
        xTicks: [],
        minPanOffset: 0,
        maxPanOffset: 0,
        dataMinS: 0,
        dataMaxS: 0,
        spotStep: 50,
      };
    }

    // 1. Parse all backend grid points
    const allPts = rawList.map((pt, i) => {
      const tgt = targetList[i];
      const s = pt.spot ?? pt.at ?? 0;
      const expP = pt.pnl ?? pt.payoff ?? 0;
      const tgtP = tgt ? (tgt.pnl ?? tgt.payoff ?? undefined) : undefined;
      return {
        spot: s,
        expiryPnL: expP,
        targetPnL: tgtP,
      };
    });

    allPts.sort((a, b) => a.spot - b.spot);

    const dataMin = allPts[0].spot;
    const dataMax = allPts[allPts.length - 1].spot;

    // 2. Sensibull Standard Deviation Calculation (1 SD = 68.2%, 2 SD = 95.4%)
    const iv = (greeks?.implied_vol && greeks.implied_vol > 0) ? greeks.implied_vol : 0.15;
    const daysToExpiry = 7; // Typical weekly baseline or ~0.019 years
    const sdMove = (payoff?.standard_deviation && payoff.standard_deviation > 0)
      ? payoff.standard_deviation
      : (spotPrice > 0 ? spotPrice * iv * Math.sqrt(daysToExpiry / 365) : (dataMax - dataMin) * 0.08);

    const bes = Array.isArray(payoff?.break_evens)
      ? payoff.break_evens.map((b: any) => (typeof b === 'number' ? b : b.spot))
      : [];

    const strikes = _legs?.map((l) => l.strike).filter((s) => s && s > 0) || [];

    // 3. Determine base spot range & slide bounds
    const step = payoff?.grid?.step || (spotPrice > 1000 ? 50 : 10);
    let baseMinS = dataMin;
    let baseMaxS = dataMax;

    if (zoomRange === 'focus' && spotPrice > 0) {
      // Sensibull strategy window: around spot ±2.5 SD, enclosing all strikes and break-evens
      let targetMin = spotPrice - 2.5 * sdMove;
      let targetMax = spotPrice + 2.5 * sdMove;

      if (strikes.length > 0) {
        targetMin = Math.min(targetMin, ...strikes.map((s) => s - 0.5 * sdMove));
        targetMax = Math.max(targetMax, ...strikes.map((s) => s + 0.5 * sdMove));
      }
      if (bes.length > 0) {
        targetMin = Math.min(targetMin, ...bes.map((b) => b - 0.5 * sdMove));
        targetMax = Math.max(targetMax, ...bes.map((b) => b + 0.5 * sdMove));
      }

      targetMin = Math.max(dataMin, targetMin);
      targetMax = Math.min(dataMax, targetMax);

      baseMinS = Math.floor(targetMin / step) * step;
      baseMaxS = Math.ceil(targetMax / step) * step;
    }

    if (baseMaxS <= baseMinS) {
      baseMaxS = baseMinS + 100;
    }

    // Determine sliding bounds relative to total available data points
    const minPan = dataMin - baseMinS;
    const maxPan = dataMax - baseMaxS;
    const effectivePan = zoomRange === 'focus' ? Math.max(minPan, Math.min(maxPan, panOffset)) : 0;

    let minS = baseMinS + effectivePan;
    let maxS = baseMaxS + effectivePan;
    minS = Math.max(dataMin, minS);
    maxS = Math.min(dataMax, maxS);

    // 4. Filter visible points with 1 boundary element padding for seamless SVG line drawing
    let firstIdx = 0;
    while (firstIdx < allPts.length && allPts[firstIdx].spot < minS) {
      firstIdx++;
    }
    let lastIdx = allPts.length - 1;
    while (lastIdx >= 0 && allPts[lastIdx].spot > maxS) {
      lastIdx--;
    }
    const sliceStart = Math.max(0, firstIdx > 0 ? firstIdx - 1 : 0);
    const sliceEnd = Math.min(allPts.length, lastIdx >= 0 ? lastIdx + 2 : allPts.length);
    const visiblePts = allPts.slice(sliceStart, sliceEnd);
    const pts = visiblePts.length >= 2 ? visiblePts : allPts;

    // 5. Evaluate PnL range in visible window (dynamically re-scales Y as user slides)
    const visiblePnls = pts.flatMap((p) =>
      p.targetPnL !== undefined ? [p.expiryPnL, p.targetPnL] : [p.expiryPnL]
    );

    let minRawP = Math.min(...visiblePnls, 0);
    let maxRawP = Math.max(...visiblePnls, 0);

    // 6. Nice Y scale anchored at 0 (e.g. 0, 5000, 10000)
    const { ticks: yTickVals, plotMinPnL, plotMaxPnL } = calculateNiceYScale(minRawP, maxRawP);

    const calcGetY = (pnl: number) => {
      if (plotMaxPnL === plotMinPnL) return padding.top + plotHeight / 2;
      return padding.top + plotHeight * (1 - (pnl - plotMinPnL) / (plotMaxPnL - plotMinPnL));
    };

    const calcGetX = (s: number) => {
      if (maxS === minS) return padding.left + plotWidth / 2;
      return padding.left + ((s - minS) / (maxS - minS)) * plotWidth;
    };

    const zY = calcGetY(0);

    const calculatedYTicks = yTickVals.map((pnl) => ({
      pnl,
      y: calcGetY(pnl),
    }));

    // 7. X Ticks with nice clean round steps
    const xRange = maxS - minS;
    const roughXStep = xRange / 5;
    const xExp = Math.floor(Math.log10(roughXStep));
    const xPow = Math.pow(10, xExp);
    const xFrac = roughXStep / xPow;
    let xMult = 1;
    if (xFrac < 1.5) xMult = 1;
    else if (xFrac < 3.5) xMult = 2;
    else if (xFrac < 7.5) xMult = 5;
    else xMult = 10;
    const xStep = Math.max(xMult * xPow, payoff?.grid?.step || 50);

    const calculatedXTicks: { spot: number; x: number }[] = [];
    const firstXTick = Math.ceil(minS / xStep) * xStep;
    for (let s = firstXTick; s <= maxS; s += xStep) {
      calculatedXTicks.push({ spot: Math.round(s), x: calcGetX(s) });
    }
    if (calculatedXTicks.length < 3) {
      const evenStep = xRange / 4;
      calculatedXTicks.length = 0;
      for (let i = 0; i < 5; i++) {
        const s = Math.round(minS + i * evenStep);
        calculatedXTicks.push({ spot: s, x: calcGetX(s) });
      }
    }

    return {
      points: pts,
      allPoints: allPts,
      minSpot: minS,
      maxSpot: maxS,
      minPnL: plotMinPnL,
      maxPnL: plotMaxPnL,
      zeroY: zY,
      breakEvens: bes,
      sd1Low: spotPrice > 0 ? Math.round(spotPrice - sdMove) : 0,
      sd1High: spotPrice > 0 ? Math.round(spotPrice + sdMove) : 0,
      sd2Low: spotPrice > 0 ? Math.round(spotPrice - 2 * sdMove) : 0,
      sd2High: spotPrice > 0 ? Math.round(spotPrice + 2 * sdMove) : 0,
      yTicks: calculatedYTicks,
      xTicks: calculatedXTicks,
      minPanOffset: minPan,
      maxPanOffset: maxPan,
      dataMinS: dataMin,
      dataMaxS: dataMax,
      spotStep: step,
    };
  }, [payoff, spotPrice, greeks, _legs, zoomRange, panOffset, plotWidth, plotHeight, padding]);

  if (!payoff?.payoff_at_expiry || payoff.payoff_at_expiry.length === 0 || points.length === 0) {
    return (
      <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-8 h-80 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm">
        <ChartIcon className="w-10 h-10 mb-3 opacity-30 text-indigo-500 dark:text-indigo-400" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-400">No Payoff Data Available</p>
        <p className="text-xs text-slate-500 mt-1">
          Click <span className="text-indigo-600 dark:text-indigo-400 font-semibold">"Analyze & Subscribe"</span> to calculate payoff curves.
        </p>
      </div>
    );
  }


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

  // Sensibull Y Tick Label Formatter: e.g. 0, 5000, 10000 or -5000
  const formatYTickLabel = (pnl: number) => {
    if (Math.abs(pnl) < 1) return '0';
    const prefix = pnl < 0 ? '-' : '';
    const absVal = Math.abs(pnl);
    if (absVal >= 100000) {
      const l = absVal / 100000;
      return `${prefix}${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
    }
    return `${prefix}${absVal}`;
  };

  // Mouse & Touch Pan Handlers (Drag to slide chart across spot prices)
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartPanRef.current = panOffset;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relX = (mouseX / rect.width) * width;

    if (isDraggingRef.current) {
      const deltaPixels = e.clientX - dragStartXRef.current;
      if (Math.abs(deltaPixels) > 2) {
        if (!isDragging) setIsDragging(true);
        setHoverData(null);
        // Dragging left moves view to higher spot prices, dragging right moves to lower spot prices
        const deltaSpot = -((deltaPixels / rect.width) * (maxSpot - minSpot));
        const newOffset = Math.max(minPanOffset, Math.min(maxPanOffset, dragStartPanRef.current + deltaSpot));
        setPanOffset(Math.round(newOffset));
        return;
      }
    }

    if (!isDragging) {
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
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    setHoverData(null);
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartXRef.current = e.touches[0].clientX;
      dragStartPanRef.current = panOffset;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (isDraggingRef.current && e.touches.length === 1) {
      const rect = e.currentTarget.getBoundingClientRect();
      const deltaPixels = e.touches[0].clientX - dragStartXRef.current;
      if (Math.abs(deltaPixels) > 2) {
        setIsDragging(true);
        setHoverData(null);
        const deltaSpot = -((deltaPixels / rect.width) * (maxSpot - minSpot));
        const newOffset = Math.max(minPanOffset, Math.min(maxPanOffset, dragStartPanRef.current + deltaSpot));
        setPanOffset(Math.round(newOffset));
      }
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  // Coordinates for key markers
  const spotX = spotPrice > 0 ? getX(spotPrice) : null;

  // Standard Deviation coordinates (1 SD = 68.2%, 2 SD = 95.4%)
  const sd1LowX = sd1Low >= minSpot && sd1Low <= maxSpot ? getX(sd1Low) : (sd1Low < minSpot ? padding.left : null);
  const sd1HighX = sd1High >= minSpot && sd1High <= maxSpot ? getX(sd1High) : (sd1High > maxSpot ? width - padding.right : null);
  const sd2LowX = sd2Low >= minSpot && sd2Low <= maxSpot ? getX(sd2Low) : null;
  const sd2HighX = sd2High >= minSpot && sd2High <= maxSpot ? getX(sd2High) : null;

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
    <div className="bg-white dark:bg-[#151921] border border-slate-200 dark:border-[#232a35] rounded-xl p-4 shadow-sm relative overflow-hidden space-y-3.5">
      {/* 1. Top Control Bar: View Switcher (Chart vs Table), SD Toggle, and Layers */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-[#232a35]">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sensibull-style View Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0d1117] p-0.5 rounded-lg border border-slate-200 dark:border-[#232a35]">
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-semibold transition-all active:scale-95 ${
                viewMode === 'chart'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-[#1a2029]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Payoff Chart
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-semibold transition-all active:scale-95 ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-[#1a2029]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Payoff Table
            </button>
          </div>

          {/* Unrealized P&L & Value (Live Metrics) */}
          {livePnL !== undefined && (
            <div className="flex items-center gap-3 font-mono text-xs bg-slate-50 dark:bg-[#0d1117] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#232a35]">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px] font-medium">Unrealized P&L:</span>
                <span className={`font-bold font-mono ${livePnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {livePnL >= 0
                    ? `+₹${livePnL.toLocaleString('en-IN', { maximumFractionDigits: 1 })}`
                    : `-₹${Math.abs(livePnL).toLocaleString('en-IN', { maximumFractionDigits: 1 })}`}
                </span>
              </div>
              {totalValue !== undefined && (
                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-[#232a35]">
                  <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px] font-medium">Value:</span>
                  <span className="font-bold font-mono text-cyan-600 dark:text-cyan-300">
                    ₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Layer Toggles & Sensibull SD Overlay Control */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Zoom: Strategy Focus vs Full Range */}
          <div className="flex items-center bg-slate-100 dark:bg-[#0d1117] p-0.5 rounded-lg border border-slate-200 dark:border-[#232a35]">
            <button
              onClick={() => { setZoomRange('focus'); setPanOffset(0); }}
              className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all active:scale-95 ${
                zoomRange === 'focus'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#1a2029]'
              }`}
              title="Focus on active strategy range (Sensibull default)"
            >
              Strategy
            </button>
            <button
              onClick={() => { setZoomRange('full'); setPanOffset(0); }}
              className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition-all active:scale-95 ${
                zoomRange === 'full'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#1a2029]'
              }`}
              title="Full range (±15%)"
            >
              Full
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0d1117] p-0.5 rounded-lg border border-slate-200 dark:border-[#232a35]">
            <span className="pl-1.5 pr-0.5 text-slate-500 dark:text-slate-400">
              <Layers className="w-3.5 h-3.5" />
            </span>
            <button
              onClick={() => setShowSD(!showSD)}
              className={`text-[11px] px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition-all active:scale-95 ${
                showSD
                  ? 'bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#1a2029]'
              }`}
            >
              <Sigma className="w-3 h-3" />
              1 SD Band
            </button>
            <button
              onClick={() => setShowZones(!showZones)}
              className={`text-[11px] px-2 py-1 rounded-md font-semibold transition-all active:scale-95 ${
                showZones
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#1a2029]'
              }`}
            >
              Zones
            </button>
            <button
              onClick={() => setShowBreakEvens(!showBreakEvens)}
              className={`text-[11px] px-2 py-1 rounded-md font-semibold transition-all active:scale-95 ${
                showBreakEvens
                  ? 'bg-slate-300 dark:bg-slate-200 text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#1a2029]'
              }`}
            >
              BE
            </button>
            {targetLine && (
              <button
                onClick={() => setShowTargetDate(!showTargetDate)}
                className={`text-[11px] px-2 py-1 rounded-md font-semibold transition-all active:scale-95 ${
                  showTargetDate
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-[#1a2029]'
                }`}
              >
                Target (T+N)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Self-Explaining Strategy Narrative Callout */}
      <div className="bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#232a35] rounded-lg px-3 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>{getNarrative()}</span>
        </div>
        {sd1Low > 0 && sd1High > 0 && (
          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>Expected 1 SD Range:</span>
            <span className="text-slate-900 dark:text-white font-bold">₹{sd1Low.toLocaleString('en-IN')} – ₹{sd1High.toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>

      {/* 3. Main View: Payoff Chart OR Payoff Table */}
      {viewMode === 'chart' ? (
        <div
          ref={containerRef}
          className="relative w-full rounded-lg overflow-hidden border border-slate-200 dark:border-[#232a35] bg-slate-50/50 dark:bg-[#0d1117] shadow-inner"
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className={`w-full h-auto select-none block transition-cursor ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <defs>
              {/* Profit Green Gradient */}
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={isDark ? "0.45" : "0.35"} />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>

              {/* Loss Red Gradient */}
              <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={isDark ? "0.45" : "0.35"} />
              </linearGradient>

              {/* Clip path for Profit Zone */}
              <clipPath id="clipProfit">
                <rect x={padding.left} y={padding.top} width={plotWidth} height={Math.max(0, zeroY - padding.top)} />
              </clipPath>

              {/* Clip path for Loss Zone */}
              <clipPath id="clipLoss">
                <rect x={padding.left} y={zeroY} width={plotWidth} height={Math.max(0, height - padding.bottom - zeroY)} />
              </clipPath>

              {/* Global Plot Area Clip */}
              <clipPath id="chartPlotClip">
                <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
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
                  fillOpacity={isDark ? "0.06" : "0.05"}
                />
                <line
                  x1={sd1LowX}
                  y1={padding.top}
                  x2={sd1LowX}
                  y2={height - padding.bottom}
                  stroke="#6366f1"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                  opacity={isDark ? "0.5" : "0.4"}
                />
                <line
                  x1={sd1HighX}
                  y1={padding.top}
                  x2={sd1HighX}
                  y2={height - padding.bottom}
                  stroke="#6366f1"
                  strokeDasharray="2 4"
                  strokeWidth="1"
                  opacity={isDark ? "0.5" : "0.4"}
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
                    opacity={isDark ? "0.3" : "0.2"}
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
                    opacity={isDark ? "0.3" : "0.2"}
                  />
                )}
                <text
                  x={(sd1LowX + sd1HighX) / 2}
                  y={padding.top + 14}
                  fill={isDark ? "#818cf8" : "#4f46e5"}
                  fillOpacity={isDark ? "0.6" : "0.7"}
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
                    fill={isDark ? "#10b981" : "#059669"}
                    fillOpacity={isDark ? "0.18" : "0.15"}
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
                    fill={isDark ? "#ef4444" : "#dc2626"}
                    fillOpacity={isDark ? "0.18" : "0.15"}
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
            {yTicks.map((yt, i) => {
              const isZero = yt.pnl === 0;
              return (
                <g key={i}>
                  {!isZero && (
                    <line
                      x1={padding.left}
                      y1={yt.y}
                      x2={width - padding.right}
                      y2={yt.y}
                      stroke={isDark ? "#232a35" : "#e2e8f0"}
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                  )}
                  <text
                    x={padding.left - 10}
                    y={yt.y + 4}
                    fill={isZero ? (isDark ? "#cbd5e1" : "#334155") : (isDark ? "#8590a2" : "#64748b")}
                    fontSize="10"
                    fontWeight={isZero ? "bold" : "normal"}
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {formatYTickLabel(yt.pnl)}
                  </text>
                </g>
              );
            })}

            {xTicks.map((xt, i) => (
              <g key={i}>
                <line
                  x1={xt.x}
                  y1={padding.top}
                  x2={xt.x}
                  y2={height - padding.bottom}
                  stroke={isDark ? "#232a35" : "#e2e8f0"}
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={xt.x}
                  y={height - padding.bottom + 18}
                  fill={isDark ? "#8590a2" : "#64748b"}
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
              fill={isDark ? "#8590a2" : "#64748b"}
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
              fill={isDark ? "#8590a2" : "#64748b"}
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
              <g clipPath="url(#chartPlotClip)">
                <path d={expiryAreaPath} fill="url(#profitFill)" clipPath="url(#clipProfit)" />
                <path d={expiryAreaPath} fill="url(#lossFill)" clipPath="url(#clipLoss)" />
              </g>
            )}

            {/* Zero P&L Reference Axis Line */}
            <line
              x1={padding.left}
              y1={zeroY}
              x2={width - padding.right}
              y2={zeroY}
              stroke={isDark ? "#475569" : "#94a3b8"}
              strokeWidth="1.5"
            />
            <text
              x={width - padding.right + 6}
              y={zeroY + 3}
              fill={isDark ? "#a1abb9" : "#64748b"}
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
                  <g key={i} className="select-none">
                    <line
                      x1={beX}
                      y1={padding.top}
                      x2={beX}
                      y2={height - padding.bottom}
                      stroke={isDark ? "#f8fafc" : "#1e293b"}
                      strokeDasharray="2 3"
                      strokeWidth="1.5"
                      opacity={isDark ? "0.85" : "0.75"}
                    />
                    {/* Diamond Marker at Zero-Line Intersection */}
                    <polygon
                      points={`${beX},${zeroY - 5} ${beX + 5},${zeroY} ${beX},${zeroY + 5} ${beX - 5},${zeroY}`}
                      fill="#10b981"
                      stroke={isDark ? "#ffffff" : "#0f172a"}
                      strokeWidth="1.5"
                    />
                    {/* Crisp Top Callout Pill */}
                    <g transform={`translate(${beX - 30}, ${padding.top - 20})`}>
                      <rect width="60" height="17" rx="4" fill={isDark ? "#0f172a" : "#1e293b"} stroke={isDark ? "#f8fafc" : "#334155"} strokeWidth="1.5" />
                      <text x="30" y="12" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
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
                <g transform={`translate(${spotX - 34}, ${height - padding.bottom + -16})`}>
                  <rect width="68" height="15" rx="3" fill="#6366f1" />
                  <text x="34" y="11" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                    Live ₹{spotPrice.toFixed(0)}
                  </text>
                </g>
              </g>
            )}

            {/* Payoff Curves inside clipped viewport */}
            <g clipPath="url(#chartPlotClip)">
              {/* Target Date (T+N) Line (Dashed Amber Glow) */}
              {showTargetDate && targetLine && (
                <path
                  d={targetLine}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeDasharray="7 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Main Expiry Payoff Curve (Solid Cyan) */}
              <path
                d={expiryLine}
                fill="none"
                stroke={isDark ? "#06b6d4" : "#0284c7"}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>

            {/* Interactive Mouse Hover Crosshair with Sensibull-style Dual Snapping Dots */}
            {hoverData && (
              <g>
                {/* Vertical Spot Alignment Line */}
                <line
                  x1={hoverData.x}
                  y1={padding.top}
                  x2={hoverData.x}
                  y2={height - padding.bottom}
                  stroke={isDark ? "#a855f7" : "#9333ea"}
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                {/* Horizontal P&L Alignment Line */}
                <line
                  x1={padding.left}
                  y1={hoverData.y}
                  x2={width - padding.right}
                  y2={hoverData.y}
                  stroke={isDark ? "#a855f7" : "#9333ea"}
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />

                {/* Expiry Curve Snapping Dot (Cyan) */}
                <circle
                  cx={hoverData.x}
                  cy={hoverData.y}
                  r="5"
                  fill={isDark ? "#06b6d4" : "#0284c7"}
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
              className="absolute z-20 pointer-events-none bg-white/95 dark:bg-[#0d1117]/95 border border-slate-300 dark:border-[#333d4d] p-3 rounded-lg shadow-2xl text-xs backdrop-blur-md transition-all duration-75 text-slate-800 dark:text-slate-200"
              style={{
                left: `${Math.min(
                  Math.max(12, (hoverData.x / width) * 100),
                  74
                )}%`,
                top: '14px',
              }}
            >
              <div className="text-slate-700 dark:text-slate-300 font-mono text-[11px] border-b border-slate-200 dark:border-[#232a35] pb-1.5 mb-2 flex items-center justify-between gap-4 font-bold">
                <span>Target Spot:</span>
                <span className="text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                  ₹{hoverData.spot.toLocaleString('en-IN')}
                  {spotPrice > 0 && (
                    <span
                      className={`text-[10px] font-normal ${
                        hoverData.spot >= spotPrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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
                  <span className="text-sky-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-cyan-400"></span>
                    Expiry P&L:
                  </span>
                  <span
                    className={`font-bold ${
                      hoverData.expiryPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {hoverData.expiryPnL >= 0 ? '+₹' : '-₹'}
                    {Math.abs(Math.round(hoverData.expiryPnL)).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Target Date P&L */}
                {showTargetDate && hoverData.targetPnL !== undefined && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                      Target (T+N) P&L:
                    </span>
                    <span
                      className={`font-bold ${
                        hoverData.targetPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {hoverData.targetPnL >= 0 ? '+₹' : '-₹'}
                      {Math.abs(Math.round(hoverData.targetPnL)).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                {/* Theta / Time Value Gap */}
                {showTargetDate && hoverData.targetPnL !== undefined && (
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-200 dark:border-[#232a35] text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Time Value / Theta Gap:</span>
                    <span
                      className={`font-bold font-mono ${
                        hoverData.targetPnL - hoverData.expiryPnL >= 0
                          ? 'text-emerald-600 dark:text-emerald-300'
                          : 'text-rose-600 dark:text-rose-300'
                      }`}
                    >
                      {hoverData.targetPnL - hoverData.expiryPnL >= 0 ? '+₹' : '-₹'}
                      {Math.abs(Math.round(hoverData.targetPnL - hoverData.expiryPnL)).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Outcome Badge */}
              <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-[#232a35] text-[10px] font-sans flex items-center gap-1">
                {hoverData.expiryPnL > 0 ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-emerald-700 dark:text-emerald-300">In Profit: strategy gains if expired here.</span>
                  </>
                ) : hoverData.expiryPnL < 0 ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span className="text-rose-700 dark:text-rose-300">In Loss: strategy loses if expired here.</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-amber-700 dark:text-amber-300">Break-Even crossover.</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Interactive Slide / Pan Bar */}
          {zoomRange === 'focus' && maxPanOffset > minPanOffset && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-[#0d1117] border-t border-slate-200 dark:border-[#232a35] text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-sans font-medium text-[11px] shrink-0">
                <MoveHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Slide Spot Range:</span>
              </div>

              <button
                onClick={() => setPanOffset((prev) => Math.max(minPanOffset, prev - (maxSpot - minSpot) * 0.35))}
                disabled={panOffset <= minPanOffset}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#1a2029] disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition active:scale-95"
                title="Slide left to lower spot prices"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 flex items-center gap-2 min-w-[180px]">
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                  ₹{dataMinS.toLocaleString('en-IN')}
                </span>
                <input
                  type="range"
                  min={minPanOffset}
                  max={maxPanOffset}
                  step={spotStep}
                  value={panOffset}
                  onChange={(e) => setPanOffset(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-[#232a35] rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                />
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                  ₹{dataMaxS.toLocaleString('en-IN')}
                </span>
              </div>

              <button
                onClick={() => setPanOffset((prev) => Math.min(maxPanOffset, prev + (maxSpot - minSpot) * 0.35))}
                disabled={panOffset >= maxPanOffset}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-[#1a2029] disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 transition active:scale-95"
                title="Slide right to higher spot prices"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/40">
                  Viewing: ₹{minSpot.toLocaleString('en-IN')} – ₹{maxSpot.toLocaleString('en-IN')}
                </span>

                {panOffset !== 0 && (
                  <button
                    onClick={() => setPanOffset(0)}
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition active:scale-95 shadow-xs"
                    title="Center view back on current spot price"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Center
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Dedicated Visual Chart Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-slate-50 dark:bg-[#0d1117] border-t border-slate-200 dark:border-[#232a35] text-[11px]">
            <div className="flex flex-wrap items-center gap-4">
              {/* Expiry Curve */}
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-[3px] bg-sky-500 dark:bg-cyan-400 rounded-full inline-block"></span>
                <span className="font-sans font-semibold text-slate-700 dark:text-slate-200">Expiry Payoff</span>
              </div>
              {/* Target Curve */}
              {targetLine && (
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-0 border-t-2 border-dashed border-amber-500 dark:border-amber-400 inline-block"></span>
                  <span className="font-sans font-semibold text-amber-600 dark:text-amber-300">Target Date (T+N)</span>
                </div>
              )}
              {/* Break Even */}
              {breakEvens.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rotate-45 bg-emerald-500 dark:bg-emerald-400 border border-slate-700 dark:border-white inline-block"></span>
                  <span className="font-sans font-semibold text-slate-700 dark:text-slate-200">Break-Even (BE)</span>
                </div>
              )}
              {/* Live Spot */}
              {spotPrice > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 inline-block"></span>
                  <span className="font-sans font-semibold text-indigo-600 dark:text-indigo-300">Live Spot</span>
                </div>
              )}
            </div>

            {/* Hint */}
            <span className="hidden sm:inline text-[10px] text-slate-500 dark:text-slate-400 font-sans">
              Drag chart horizontally or use slider to slide view • Hover to inspect P&L
            </span>
          </div>
        </div>
      ) : (
        /* Sensibull-style Payoff Table View */
        <div className="rounded-lg border border-slate-200 dark:border-[#232a35] bg-white dark:bg-[#0d1117] overflow-hidden max-h-[360px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="sticky top-0 bg-slate-100 dark:bg-[#151921] border-b border-slate-200 dark:border-[#232a35] text-[10px] uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Spot Target</th>
                <th className="py-2.5 px-3">% Move</th>
                <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">Target (T+N) P&L</th>
                <th className="py-2.5 px-3 text-sky-600 dark:text-cyan-300">Expiry P&L</th>
                <th className="py-2.5 px-3">Probability Zone</th>
                <th className="py-2.5 px-3 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#232a35]">
              {(zoomRange === 'focus' ? points : allPoints)
                .filter((_, idx, arr) => zoomRange === 'focus' ? (idx % 2 === 0 || idx === arr.length - 1) : (idx % 3 === 0 || idx === arr.length - 1))
                .map((p, i) => {
                  const isCurrent = Math.abs(p.spot - spotPrice) < (maxSpot - minSpot) / (points.length * 2);
                  const pctMove = spotPrice > 0 ? ((p.spot - spotPrice) / spotPrice) * 100 : 0;
                  const in1SD = sd1Low > 0 && p.spot >= sd1Low && p.spot <= sd1High;

                  return (
                    <tr
                      key={i}
                      className={`hover:bg-slate-50 dark:hover:bg-[#151921] transition ${
                        isCurrent ? 'bg-indigo-50 dark:bg-indigo-600/10 font-bold border-l-2 border-indigo-500' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></span>}
                        ₹{p.spot.toLocaleString('en-IN')}
                      </td>
                      <td
                        className={`py-2 px-3 ${
                          pctMove > 0 ? 'text-emerald-600 dark:text-emerald-400' : pctMove < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {pctMove >= 0 ? '+' : ''}
                        {pctMove.toFixed(1)}%
                      </td>
                      <td
                        className={`py-2 px-3 font-semibold ${
                          (p.targetPnL ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
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
                          p.expiryPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {p.expiryPnL >= 0 ? '+₹' : '-₹'}
                        {Math.abs(Math.round(p.expiryPnL)).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-[10px]">
                        {in1SD ? (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/25">
                            Within 1 SD (68%)
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Outlier / 2 SD</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {p.expiryPnL > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">PROFIT</span>
                        ) : p.expiryPnL < 0 ? (
                          <span className="text-rose-600 dark:text-rose-400 text-[10px] font-bold">LOSS</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">BE</span>
                        )}
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
