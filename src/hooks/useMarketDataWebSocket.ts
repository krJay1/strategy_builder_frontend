import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { strategyApi, InstrumentSubscriptionItem } from '../api/strategyApi';

export type MarketWSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

const MAX_RECONNECT_ATTEMPTS = 5;

interface UseMarketDataWebSocketProps {
  token: string;
  userId: string;
  apiUrl?: string;
  marketWsUrl?: string;
  instruments: InstrumentSubscriptionItem[];
  enabled?: boolean;
}

export function extractTicks(payload: any, inheritedId?: number): { id: number; ltp: number }[] {
  const results: { id: number; ltp: number }[] = [];
  if (!payload) return results;

  if (typeof payload === 'string') {
    const s = payload.trim();
    if (!s) return results;

    // Handle Socket.IO frame prefix if present (e.g. 42["1501-json-partial", ...])
    const match = s.match(/^\d+\[(.*)\]$/s);
    if (match) {
      try {
        const parsedArr = JSON.parse(`[${match[1]}]`);
        if (Array.isArray(parsedArr)) {
          for (let i = 0; i < parsedArr.length; i++) {
            if (
              typeof parsedArr[i] === 'object' ||
              (typeof parsedArr[i] === 'string' &&
                (parsedArr[i].startsWith('{') || parsedArr[i].startsWith('[')))
            ) {
              results.push(...extractTicks(parsedArr[i], inheritedId));
            }
          }
          if (results.length > 0) return results;
        }
      } catch {
        // ignore
      }
    }

    try {
      const parsed = JSON.parse(s);
      return extractTicks(parsed, inheritedId);
    } catch {
      return results;
    }
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      results.push(...extractTicks(item, inheritedId));
    }
    return results;
  }

  if (typeof payload === 'object') {
    const rawId =
      payload.exchangeInstrumentId ??
      payload.ExchangeInstrumentID ??
      payload.exchangeInstrumentID ??
      payload.ExchangeInstrumentId ??
      payload.instrumentId ??
      payload.InstrumentID ??
      payload.exchange_instrument_id ??
      payload.Exchange_Instrument_Id ??
      payload.id ??
      payload.ID ??
      inheritedId;

    const rawLtp =
      payload.LTP ??
      payload.ltp ??
      payload.LastTradedPrice ??
      payload.lastTradedPrice ??
      payload.LastPrice ??
      payload.lastPrice ??
      payload.Price ??
      payload.price ??
      payload.Close ??
      payload.close ??
      payload.ClosePrice ??
      payload.closePrice;

    const currentId =
      rawId !== undefined && !isNaN(Number(rawId)) && Number(rawId) > 0
        ? Number(rawId)
        : undefined;
    const currentLtp =
      rawLtp !== undefined && !isNaN(Number(rawLtp)) && Number(rawLtp) > 0
        ? Number(rawLtp)
        : undefined;

    if (currentId !== undefined && currentLtp !== undefined) {
      results.push({ id: currentId, ltp: currentLtp });
    }

    // Inspect nested wrappers and event containers
    const nestedKeys = [
      'data',
      'Data',
      'DATA',
      'TOUCHLINE',
      'Touchline',
      'touchline',
      'MARKETDEPTH',
      'MarketDepth',
      'marketDepth',
      'CANDLE',
      'Candle',
      'candle',
      'QUOTE',
      'Quote',
      'quote',
      'result',
      'Result',
      'RESULT',
      'payload',
      'Payload',
      'PAYLOAD',
      'OpenInterest',
      'openInterest',
      'OPENINTEREST',
    ];

    for (const key of nestedKeys) {
      if (payload[key] !== undefined && payload[key] !== null) {
        results.push(...extractTicks(payload[key], currentId || inheritedId));
      }
    }
  }

  return results;
}

export function useMarketDataWebSocket({
  token,
  userId,
  apiUrl,
  marketWsUrl,
  instruments,
  enabled = true,
}: UseMarketDataWebSocketProps) {
  const [status, setStatus] = useState<MarketWSStatus>('disconnected');
  const [livePrices, setLivePrices] = useState<Record<number, number>>({});
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const isManualCloseRef = useRef(false);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const pingIntervalRef = useRef<any>(null);
  const subscribedMapRef = useRef<Map<string, InstrumentSubscriptionItem>>(new Map());
  const lastSubscribedFingerprintRef = useRef<string>('');
  const debounceTimerRef = useRef<any>(null);
  const flushTimerRef = useRef<any>(null);
  const pendingTicksRef = useRef<Record<number, number>>({});
  const instrumentsRef = useRef<InstrumentSubscriptionItem[]>(instruments);

  // Keep instruments ref up to date
  instrumentsRef.current = instruments;

  // Filter and deduplicate valid instruments to a stable string fingerprint
  const instrumentsFingerprint = useMemo(() => {
    const valid = instruments.filter(
      (i) => i && Number(i.exchangeSegment) > 0 && Number(i.exchangeInstrumentID) > 0
    );
    return Array.from(
      new Set(valid.map((i) => `${i.exchangeSegment}_${i.exchangeInstrumentID}`))
    )
      .sort()
      .join(',');
  }, [instruments]);

  // Construct WebSocket Endpoint URL
  const wsEndpoint = useMemo(() => {
    let base = marketWsUrl?.trim();
    if (!base) {
      if (apiUrl && apiUrl.startsWith('http')) {
        try {
          const u = new URL(apiUrl);
          // If pointing to a remote host (e.g. uat.firstdemat.in), use its remote host
          if (!u.hostname.includes('localhost') && !u.hostname.includes('127.0.0.1')) {
            const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
            base = `${proto}//${u.host}/ws`;
          } else {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            base = `${proto}//${window.location.host}/ws`;
          }
        } catch {
          const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          base = `${proto}//${window.location.host}/ws`;
        }
      } else {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        base = `${proto}//${window.location.host}/ws`;
      }
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    try {
      const url = new URL(base, window.location.origin);
      if (userId) {
        url.searchParams.set('User-Id', userId.trim());
      }
      if (cleanToken) {
        url.searchParams.set('Access-Token', cleanToken);
      }
      return url.toString();
    } catch {
      return base;
    }
  }, [marketWsUrl, apiUrl, userId, token]);

  // Flush batched ticks to state on animation/throttle frame
  const scheduleTickFlush = useCallback(() => {
    if (flushTimerRef.current) return;
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      const pending = pendingTicksRef.current;
      const keys = Object.keys(pending);
      if (keys.length === 0) return;

      const nextBatch = { ...pending };
      pendingTicksRef.current = {};

      setLivePrices((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [idStr, ltp] of Object.entries(nextBatch)) {
          const id = Number(idStr);
          if (next[id] !== ltp) {
            next[id] = ltp;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 60);
  }, []);

  // Connect WebSocket with backoff and retry guard
  const connect = useCallback(
    (isManual = false) => {
      if (isManual) {
        reconnectAttemptsRef.current = 0;
      }

      if (!enabled || !token) {
        setStatus((prev) => (prev !== 'disconnected' ? 'disconnected' : prev));
        return;
      }

      // If socket is already open or connecting to the current endpoint, do not recreate
      if (
        socketRef.current &&
        (socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      if (socketRef.current) {
        isManualCloseRef.current = true;
        socketRef.current.close();
        socketRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      setStatus('connecting');
      setError(null);

      try {
        isManualCloseRef.current = false;
        const ws = new WebSocket(wsEndpoint);
        socketRef.current = ws;

        ws.onopen = () => {
          setStatus('connected');
          setError(null);
          isManualCloseRef.current = false;
          reconnectAttemptsRef.current = 0;

          // Start ping heartbeat every 15s
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: 'ping' }));
            }
          }, 15000);
        };

        ws.onmessage = async (event) => {
          try {
            let data = event.data;
            if (typeof Blob !== 'undefined' && data instanceof Blob) {
              data = await data.text();
            } else if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
              data = new TextDecoder().decode(data);
            }
            const ticks = extractTicks(data);
            if (ticks.length > 0) {
              for (const { id, ltp } of ticks) {
                pendingTicksRef.current[id] = ltp;
              }
              scheduleTickFlush();
            }
          } catch (err) {
            console.warn('Market WS message parse warning:', err);
          }
        };

        ws.onerror = () => {
          setStatus((prev) => (prev !== 'error' ? 'error' : prev));
          setError('Market Data WebSocket connection error');
        };

        ws.onclose = () => {
          setStatus((prev) => (prev !== 'disconnected' ? 'disconnected' : prev));
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }

          // Auto-reconnect with exponential backoff on unexpected disconnect
          if (!isManualCloseRef.current && enabled && token) {
            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
              const delay = Math.min(
                1000 * Math.pow(1.5, reconnectAttemptsRef.current) + Math.random() * 500,
                15000
              );
              reconnectAttemptsRef.current += 1;
              if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = setTimeout(() => {
                connect(false);
              }, delay);
            } else {
              setError('Market Data feed paused after multiple retries. Click Sync to reconnect.');
            }
          }
        };
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Failed to initialize Market WebSocket');
      }
    },
    [enabled, token, wsEndpoint, scheduleTickFlush]
  );

  // Auto-connect once when enabled, token, or wsEndpoint changes
  useEffect(() => {
    reconnectAttemptsRef.current = 0;
    connect(true);
    return () => {
      isManualCloseRef.current = true;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    };
  }, [connect]);

  // Reconcile subscriptions via REST (subscribing new & unsubscribing removed instruments)
  const syncSubscriptions = useCallback(async () => {
    if (!token) return;

    const currentFingerprint = instrumentsFingerprint;
    if (lastSubscribedFingerprintRef.current === currentFingerprint) {
      return;
    }

    const currentList = instrumentsRef.current.filter(
      (i) => i && Number(i.exchangeSegment) > 0 && Number(i.exchangeInstrumentID) > 0
    );

    const currentMap = new Map<string, InstrumentSubscriptionItem>();
    for (const inst of currentList) {
      currentMap.set(`${inst.exchangeSegment}_${inst.exchangeInstrumentID}`, inst);
    }

    const prevMap = subscribedMapRef.current;

    // 1. Identify removed instruments that require unsubscription (PUT)
    const toUnsubscribe: InstrumentSubscriptionItem[] = [];
    for (const [key, inst] of prevMap.entries()) {
      if (!currentMap.has(key)) {
        toUnsubscribe.push(inst);
      }
    }

    // 2. Identify new instruments that require subscription (POST)
    const toSubscribe: InstrumentSubscriptionItem[] = [];
    for (const [key, inst] of currentMap.entries()) {
      if (!prevMap.has(key)) {
        toSubscribe.push(inst);
      }
    }

    if (toUnsubscribe.length === 0 && toSubscribe.length === 0) {
      lastSubscribedFingerprintRef.current = currentFingerprint;
      return;
    }

    setIsSubscribing(true);

    try {
      // Execute unsubscriptions via PUT
      if (toUnsubscribe.length > 0) {
        await strategyApi.unsubscribeMarketData(toUnsubscribe);
        for (const inst of toUnsubscribe) {
          prevMap.delete(`${inst.exchangeSegment}_${inst.exchangeInstrumentID}`);
        }
      }

      // Execute new subscriptions via POST
      if (toSubscribe.length > 0) {
        await strategyApi.subscribeMarketData(toSubscribe);
        for (const inst of toSubscribe) {
          prevMap.set(`${inst.exchangeSegment}_${inst.exchangeInstrumentID}`, inst);
        }
      }
      lastSubscribedFingerprintRef.current = currentFingerprint;
    } catch (err: any) {
      console.warn('Market data subscription sync warning:', err.message);
      // Mark fingerprint as processed to prevent infinite retry loop
      lastSubscribedFingerprintRef.current = currentFingerprint;
    } finally {
      setIsSubscribing(false);
    }
  }, [token, instrumentsFingerprint]);

  // Debounced subscription reconciliation ONLY when actual instrument IDs change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (token && enabled) {
      debounceTimerRef.current = setTimeout(() => {
        syncSubscriptions();
      }, 100);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [instrumentsFingerprint, token, enabled, syncSubscriptions]);

  return {
    status,
    livePrices,
    isSubscribing,
    error,
    reconnect: () => connect(true),
    resubscribe: syncSubscriptions,
  };
}
