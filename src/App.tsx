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
import { strategyApi, UserCredentials, InstrumentSubscriptionItem, getStoredCredentials } from './api/strategyApi';
import { StrategyRequest, StrategyResponse, LegRequest, UnderlyingRequest, toSegmentNumber } from './types/strategy';
import { notify, Toaster } from './utils/toast';
import { ENV } from './config';

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const App: React.FC = () => {
  // Credentials State (Initialized from stored credentials or ENV defaults)
  const [credentials, setCredentials] = useState<UserCredentials>(() => getStoredCredentials());
  const [isCredsOpen, setIsCredsOpen] = useState(false);

  // Strategy Form State (Defaults to ENV Configured Underlying)
  const [underlying, setUnderlying] = useState<UnderlyingRequest>({
    exchange_segment: ENV.DEFAULT_UNDERLYING_SEGMENT,
    exchange_instrument_id: ENV.DEFAULT_UNDERLYING_ID,
    spot: ENV.DEFAULT_UNDERLYING_SPOT,
  });
  const [targetDate, setTargetDate] = useState<string>(() => getTodayDateString());
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
    clearSnapshot: clearStrategySnapshot,
  } = useStrategyWebSocket(credentials.token, credentials.userId, credentials.clientId, true);

  // Handle Underlying Change: Unsubscribe previous, clear legs & strategy, subscribe new
  const handleUnderlyingChange = (nextUnderlying: UnderlyingRequest) => {
    const isInstrumentChanged =
      toSegmentNumber(nextUnderlying.exchange_segment) !== toSegmentNumber(underlying.exchange_segment) ||
      Number(nextUnderlying.exchange_instrument_id) !== Number(underlying.exchange_instrument_id);

    setUnderlying(nextUnderlying);

    if (isInstrumentChanged) {
      // 1. Clear strategy legs
      setLegs([]);

      // 2. Clear strategy calculations & live stream snapshot
      setStrategyData(null);
      clearStrategySnapshot();

      // 3. Unsubscribe strategy in backend if credentials are configured
      if (credentials.token) {
        strategyApi.unsubscribeStrategy().catch((err) => {
          console.debug('Strategy unsubscribe on underlying change:', err);
        });
      }
    }
  };

  // Combine live prices from pre-validation market data feed & strategy engine snapshot (strictly market ticks, never user entry price)
  const livePrices: Record<number, number> = {
    ...marketDataLivePrices,
  };
  if (snapshot?.legs) {
    for (const leg of snapshot.legs) {
      const id = leg.exchange_instrument_id;
      const ltp = leg.ltp;
      if (id && ltp && ltp > 0) {
        livePrices[id] = ltp;
      }
    }
  }

  // Active Data (Prioritizes live WebSocket snapshot, falls back to HTTP response)
  const activePayoff = snapshot?.payoff || strategyData?.payoff;
  const activeGreeks = snapshot?.greeks || strategyData?.greeks;
  const activeMargin = strategyData?.margin;
  const activeLegs = snapshot?.legs || strategyData?.legs;
  const liveUnderlyingLtp = underlying.exchange_instrument_id ? livePrices[underlying.exchange_instrument_id] : undefined;
  const currentSpot = liveUnderlyingLtp || snapshot?.underlying?.spot || strategyData?.underlying?.spot || underlying.spot || 0;
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
      legs: legs.map((leg, idx) => ({
        ...leg,
        leg_index: leg.leg_index ?? idx + 1,
      })),
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
      clearStrategySnapshot();
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
      <main className="flex-1 w-full mx-auto px-2 sm:px-3 md:px-12 py-3 space-y-3.5">
        {/* Main 2-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* LEFT COLUMN: Strategy Configuration & Margin */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-4">
            {/* 1. Underlying Selector */}
            <UnderlyingSection
              underlying={underlying}
              onChange={handleUnderlyingChange}
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
            <MarginCard margin={activeMargin} isLoading={isLoading} />
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
              legs={activeLegs}
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
          notify.success('Credentials Updated', `Session token configured for user ${c.userId || ENV.DEFAULT_USER_ID}`);
        }}
      />

      {/* Shadcn Sonner Rich Toaster (Auto closes after 1000ms) */}
      <Toaster />
    </div>
  );
};

export default App;
