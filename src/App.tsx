import React, { useState } from 'react';
import { Header } from './components/Header';
import { CredentialsModal } from './components/CredentialsModal';
import { UnderlyingSection } from './components/UnderlyingSection';
import { LegsBuilder } from './components/LegsBuilder';
import { PayoffChart } from './components/PayoffChart';
import { SummaryMetrics } from './components/SummaryMetrics';
import { GreeksCard } from './components/GreeksCard';
import { MarginCard } from './components/MarginCard';
import { EnrichedLegsTable } from './components/EnrichedLegsTable';
import { useStrategyWebSocket } from './hooks/useStrategyWebSocket';
import { strategyApi, UserCredentials } from './api/strategyApi';
import { StrategyRequest, StrategyResponse, LegRequest, UnderlyingRequest } from './types/strategy';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  // Credentials State
  const [credentials, setCredentials] = useState<UserCredentials>(() => ({
    token: localStorage.getItem('sym_token') || '',
    userId: localStorage.getItem('sym_user_id') || 'AA002',
    clientId: localStorage.getItem('sym_client_id') || 'AA002',
    apiUrl: localStorage.getItem('api_url') || '',
  }));
  const [isCredsOpen, setIsCredsOpen] = useState(false);

  // Strategy Form State (Defaults to Reliance Call Spread Sample)
  const [underlying, setUnderlying] = useState<UnderlyingRequest>({
    exchange_segment: 1, // NSECM
    exchange_instrument_id: 2885, // RELIANCE
    spot: 1309.1,
  });
  const [targetDate, setTargetDate] = useState<string>('');
  const [legs, setLegs] = useState<LegRequest[]>([
    {
      exchange_segment: 2, // NSEFO
      exchange_instrument_id: 144396,
      side: 'BUY',
      lots: 1,
      entry_price: 120,
    },
    {
      exchange_segment: 2, // NSEFO
      exchange_instrument_id: 144397,
      side: 'BUY',
      lots: 1,
      entry_price: 120,
    },
  ]);

  // Strategy Calculation Response State
  const [strategyData, setStrategyData] = useState<StrategyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // WebSocket Live Hook with Query Params
  const {
    status: wsStatus,
    snapshot,
    connect,
  } = useStrategyWebSocket(credentials.token, credentials.userId, credentials.clientId, true);

  // Active Data (Prioritizes live WebSocket snapshot, falls back to HTTP response)
  const activePayoff = snapshot?.payoff || strategyData?.payoff;
  const activeGreeks = snapshot?.greeks || strategyData?.greeks;
  const activeMargin = snapshot?.margin || strategyData?.margin;
  const activeLegs = snapshot?.legs || strategyData?.legs;
  const currentSpot = snapshot?.underlying?.spot || strategyData?.underlying?.spot || underlying.spot || 0;
  const livePnL = snapshot?.live_pnl;
  const totalValue = snapshot?.total_value;

  // Live prices dictionary
  const livePrices: Record<number, number> = {};
  if (snapshot?.legs) {
    for (const leg of snapshot.legs) {
      const id = leg.exchange_instrument_id;
      const ltp = leg.ltp || leg.price || 0;
      if (id && ltp > 0) {
        livePrices[id] = ltp;
      }
    }
  }

  // Handle Strategy Submission (Preview + Subscribe)
  const handleExecuteStrategy = async () => {
    if (!credentials.token) {
      setIsCredsOpen(true);
      setErrorMessage('Please provide a Symphony Session Token first.');
      return;
    }

    if (legs.length === 0) {
      setErrorMessage('Please add at least one strategy leg.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const payload: StrategyRequest = {
      underlying,
      target_date: targetDate || undefined,
      legs,
    };

    try {
      const res = await strategyApi.createStrategy(payload);
      setStrategyData(res);
      setSuccessMessage('Strategy subscribed! Receiving real-time WebSocket events...');
      // Reconnect/Ensure WS is listening with active query params
      connect();
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to execute strategy';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Unsubscribe
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const handleUnsubscribe = async () => {
    setIsUnsubscribing(true);
    setErrorMessage(null);
    try {
      await strategyApi.unsubscribeStrategy();
      setStrategyData(null);
      setSuccessMessage('Strategy unsubscribed from live stream.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to unsubscribe');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 flex flex-col bg-ambient">
      {/* Header */}
      <Header
        wsStatus={wsStatus}
        userId={credentials.userId}
        hasToken={Boolean(credentials.token)}
        onOpenSettings={() => setIsCredsOpen(true)}
        onUnsubscribe={handleUnsubscribe}
        isUnsubscribing={isUnsubscribing}
        onRefresh={handleExecuteStrategy}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 space-y-4">
        {/* Live PnL Ribbon (when live stream is active) */}
        {livePnL !== undefined && (
          <div className="bg-[#1e2124] border border-[#2d3239] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-md">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">Live Position:</span>
              <span className="font-bold text-slate-200 font-mono">
                {snapshot?.underlying?.name || 'Strategy'} (₹{currentSpot.toLocaleString('en-IN')})
              </span>
            </div>
            <div className="flex items-center gap-5 font-mono">
              <div>
                <span className="text-slate-400 mr-1.5 text-[11px]">Unrealized P&L:</span>
                <span className={`font-bold text-sm ${livePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {livePnL >= 0 ? `+₹${livePnL.toLocaleString('en-IN')}` : `-₹${Math.abs(livePnL).toLocaleString('en-IN')}`}
                </span>
              </div>
              {totalValue !== undefined && (
                <div>
                  <span className="text-slate-400 mr-1.5 text-[11px]">Value:</span>
                  <span className="font-bold text-cyan-300">
                    ₹{totalValue.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 flex items-center justify-between text-xs text-rose-300 animate-in fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-200 text-xs ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300 animate-in fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-slate-400 hover:text-slate-200 text-xs ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main 2-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT COLUMN: Strategy Configuration & Margin */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4">
            {/* 1. Underlying Selector */}
            <UnderlyingSection
              underlying={underlying}
              onChange={setUnderlying}
              targetDate={targetDate}
              onTargetDateChange={setTargetDate}
              liveSpot={currentSpot}
              underlyingName={snapshot?.underlying?.name || strategyData?.underlying?.name}
            />

            {/* 2. Strategy Legs Configuration & Action */}
            <LegsBuilder
              legs={legs}
              onChange={setLegs}
              disabled={isLoading}
              livePrices={livePrices}
              onAnalyze={handleExecuteStrategy}
              isLoading={isLoading}
            />

            {/* 3. Margin & Capital Requirements Card */}
            <MarginCard margin={activeMargin} />
          </div>

          {/* RIGHT COLUMN: Payoff Chart on top & Analytics below */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-4">
            {/* 1. Payoff Curve Chart (At the very top!) */}
            <PayoffChart payoff={activePayoff} spotPrice={currentSpot} greeks={activeGreeks} />

            {/* 2. Summary Analytics Cards */}
            {activePayoff && <SummaryMetrics payoff={activePayoff} />}

            {/* 3. Greeks Breakdown */}
            <GreeksCard greeks={activeGreeks} />

            {/* 4. Live Enriched Legs Table */}
            {activeLegs && activeLegs.length > 0 && (
              <EnrichedLegsTable legs={activeLegs} livePrices={livePrices} />
            )}
          </div>
        </div>
      </main>

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={isCredsOpen}
        onClose={() => setIsCredsOpen(false)}
        credentials={credentials}
        onSave={(c) => {
          setCredentials(c);
          setErrorMessage(null);
        }}
      />
    </div>
  );
};

export default App;
