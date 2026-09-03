import React, { useState, useMemo } from 'react';
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
import { useMarketDataWebSocket } from './hooks/useMarketDataWebSocket';
import { strategyApi, UserCredentials, InstrumentSubscriptionItem } from './api/strategyApi';
import { StrategyRequest, StrategyResponse, LegRequest, UnderlyingRequest, toSegmentNumber } from './types/strategy';
import { Toaster } from './components/ui/sonner';
import { notify } from './utils/toast';

export const App: React.FC = () => {
  // Credentials State
  const [credentials, setCredentials] = useState<UserCredentials>(() => ({
    token: localStorage.getItem('sym_token') || '',
    userId: localStorage.getItem('sym_user_id') || 'AA002',
    clientId: localStorage.getItem('sym_client_id') || 'AA002',
    apiUrl: localStorage.getItem('api_url') || '',
    marketWsUrl: localStorage.getItem('market_ws_url') || '',
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

  // Stabilized instrument IDs serialization to prevent recalculation on spot or price edits
  const legsFingerprint = useMemo(() => {
    return legs
      .map((l) => `${toSegmentNumber(l.exchange_segment)}_${l.exchange_instrument_id}`)
      .join(',');
  }, [legs]);

  // Gather all active instruments for pre-validation market data subscription
  const marketInstruments = useMemo<InstrumentSubscriptionItem[]>(() => {
    const list: InstrumentSubscriptionItem[] = [];
    const undSeg = toSegmentNumber(underlying.exchange_segment);
    if (undSeg > 0 && Number(underlying.exchange_instrument_id) > 0) {
      list.push({
        exchangeSegment: undSeg,
        exchangeInstrumentID: Number(underlying.exchange_instrument_id),
      });
    }
    for (const leg of legs) {
      const legSeg = toSegmentNumber(leg.exchange_segment);
      if (legSeg > 0 && Number(leg.exchange_instrument_id) > 0) {
        list.push({
          exchangeSegment: legSeg,
          exchangeInstrumentID: Number(leg.exchange_instrument_id),
        });
      }
    }
    return list;
  }, [underlying.exchange_segment, underlying.exchange_instrument_id, legsFingerprint]);

  // 1. Pre-Validation Market Data WebSocket Hook (Symphony /ws)
  const { livePrices: marketDataLivePrices } = useMarketDataWebSocket({
    token: credentials.token,
    userId: credentials.userId,
    apiUrl: credentials.apiUrl,
    marketWsUrl: credentials.marketWsUrl,
    instruments: marketInstruments,
    enabled: Boolean(credentials.token),
  });

  // 2. Strategy Calculation WebSocket Hook (Unchanged)
  const {
    status: wsStatus,
    snapshot,
    connect,
  } = useStrategyWebSocket(credentials.token, credentials.userId, credentials.clientId, true);

  // Combine live prices from pre-validation market data feed & strategy engine snapshot
  const livePrices: Record<number, number> = {
    ...marketDataLivePrices,
  };
  if (snapshot?.legs) {
    for (const leg of snapshot.legs) {
      const id = leg.exchange_instrument_id;
      const ltp = leg.ltp || leg.price || 0;
      if (id && ltp > 0) {
        livePrices[id] = ltp;
      }
    }
  }

  // Active Data (Prioritizes live WebSocket snapshot, falls back to HTTP response)
  const activePayoff = snapshot?.payoff || strategyData?.payoff;
  const activeGreeks = snapshot?.greeks || strategyData?.greeks;
  const activeMargin = snapshot?.margin || strategyData?.margin;
  const activeLegs = snapshot?.legs || strategyData?.legs;
  const liveUnderlyingLtp = underlying.exchange_instrument_id ? livePrices[underlying.exchange_instrument_id] : undefined;
  const currentSpot = snapshot?.underlying?.spot || liveUnderlyingLtp || strategyData?.underlying?.spot || underlying.spot || 0;
  const livePnL = snapshot?.live_pnl;
  const totalValue = snapshot?.total_value;

  // Handle Strategy Submission (Preview + Subscribe)
  const handleExecuteStrategy = async () => {
    if (!credentials.token) {
      setIsCredsOpen(true);
      notify.warning('Missing Credentials', 'Please provide a Symphony Session Token first.');
      return;
    }

    if (legs.length === 0) {
      notify.warning('Missing Legs', 'Please add at least one strategy leg.');
      return;
    }

    if (!underlying.exchange_instrument_id || underlying.exchange_instrument_id <= 0) {
      notify.warning('Invalid Underlying', 'Please provide a valid underlying instrument ID.');
      return;
    }

    if (!underlying.spot || underlying.spot <= 0 || isNaN(underlying.spot)) {
      notify.warning('Invalid Spot Price', 'Underlying spot price is required and must be greater than zero.');
      return;
    }

    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (!l.exchange_instrument_id || l.exchange_instrument_id <= 0) {
        notify.warning('Invalid Leg', `Leg #${i + 1}: Instrument ID is required.`);
        return;
      }
      if (!l.lots || l.lots <= 0) {
        notify.warning('Invalid Lots', `Leg #${i + 1}: Lots must be greater than zero.`);
        return;
      }
      const entryPx = l.entry_price || l.price;
      if (!entryPx || entryPx <= 0 || isNaN(entryPx)) {
        notify.warning('Invalid Entry Price', `Leg #${i + 1}: Entry price is required and must be greater than zero.`);
        return;
      }
    }

    setIsLoading(true);

    const payload: StrategyRequest = {
      underlying,
      target_date: targetDate || undefined,
      legs,
    };

    try {
      const res = await strategyApi.createStrategy(payload);
      setStrategyData(res);
      notify.success('Strategy Subscribed!', 'Live calculation and WebSocket ticker stream active.');
      // Reconnect/Ensure WS is listening with active query params
      connect();
    } catch (err: any) {
      notify.apiError('Strategy Calculation Failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Unsubscribe
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const handleUnsubscribe = async () => {
    setIsUnsubscribing(true);
    try {
      await strategyApi.unsubscribeStrategy();
      setStrategyData(null);
      notify.info('Strategy Unsubscribed', 'Disconnected from real-time stream.');
    } catch (err: any) {
      notify.apiError('Unsubscribe Failed', err);
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
            <PayoffChart
              payoff={activePayoff}
              spotPrice={currentSpot}
              greeks={activeGreeks}
              livePnL={livePnL}
              totalValue={totalValue}
            />

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
          notify.success('Credentials Updated', `Session token configured for user ${c.userId || 'AA002'}`);
        }}
      />

      {/* Shadcn Sonner Rich Toaster (Auto closes after 1000ms) */}
      <Toaster />
    </div>
  );
};

export default App;
