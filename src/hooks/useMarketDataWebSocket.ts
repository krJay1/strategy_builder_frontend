import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { strategyApi, InstrumentSubscriptionItem } from '../api/strategyApi';
import { notify } from '../utils/toast';

export type MarketWSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseMarketDataWebSocketProps {
  token: string;
  userId: string;
  apiUrl?: string;
  marketWsUrl?: string;
  instruments: InstrumentSubscriptionItem[];
  enabled?: boolean;
}

function extractTicks(payload: any): { id: number; ltp: number }[] {
  const results: { id: number; ltp: number }[] = [];
  if (!payload) return results;

  if (typeof payload === 'string') {
    const s = payload.trim();
    // Handle Socket.IO frame prefix if present (e.g. 42["1501-json-partial", ...])
    if (s.startsWith('42[') || s.startsWith('40[') || s.startsWith('43[')) {
      try {
        const jsonStr = s.slice(2);
        const parsedArr = JSON.parse(jsonStr);
        if (Array.isArray(parsedArr) && parsedArr.length > 1) {
          return extractTicks(parsedArr[1]);
        }
      } catch {
        // ignore
      }
    }
    try {
      const parsed = JSON.parse(payload);
      return extractTicks(parsed);
    } catch {
      return results;
    }
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      results.push(...extractTicks(item));
    }
    return results;
  }

  if (typeof payload === 'object') {
    // Nested wrapper extraction
    if (payload.data) {
      results.push(...extractTicks(payload.data));
    }
    if (payload.CANDLE) {
      results.push(...extractTicks(payload.CANDLE));
    }
    if (payload.Touchline) {
      const id =
        payload.ExchangeInstrumentID ||
        payload.exchangeInstrumentID ||
        payload.ExchangeInstrumentId ||
        payload.instrumentId;
      const ltp =
        payload.Touchline.LastTradedPrice ??
        payload.Touchline.lastTradedPrice ??
        payload.Touchline.LTP ??
        payload.Touchline.ltp;
      if (id && ltp !== undefined && Number(ltp) > 0) {
        results.push({ id: Number(id), ltp: Number(ltp) });
      }
    }

    const id =
      payload.ExchangeInstrumentID ||
      payload.exchangeInstrumentID ||
      payload.ExchangeInstrumentId ||
      payload.instrumentId ||
      payload.InstrumentID;

    const ltp =
      payload.LastTradedPrice ??
      payload.lastTradedPrice ??
      payload.LTP ??
      payload.ltp ??
      payload.Close ??
      payload.close;

    if (id && ltp !== undefined && Number(ltp) > 0) {
      results.push({ id: Number(id), ltp: Number(ltp) });
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
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);
  const subscribedMapRef = useRef<Map<string, InstrumentSubscriptionItem>>(new Map());
  const debounceTimerRef = useRef<any>(null);

  // Filter valid instruments
  const validInstruments = useMemo(() => {
    const map = new Map<string, InstrumentSubscriptionItem>();
    for (const inst of instruments) {
      if (inst.exchangeSegment > 0 && inst.exchangeInstrumentID > 0) {
        const key = `${inst.exchangeSegment}_${inst.exchangeInstrumentID}`;
        if (!map.has(key)) {
          map.set(key, inst);
        }
      }
    }
    return Array.from(map.values());
  }, [instruments]);

  // Construct WebSocket Endpoint URL
  const wsEndpoint = useMemo(() => {
    let base = marketWsUrl?.trim();
    if (!base) {
      if (apiUrl && apiUrl.startsWith('http')) {
        const u = new URL(apiUrl);
        const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
        base = `${proto}//${u.host}/ws`;
      } else {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || 'localhost';
        base = `${proto}//${host}:8081/ws`;
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

  // Connect WebSocket
  const connect = useCallback(() => {
    if (!enabled || !token) {
      setStatus('disconnected');
      return;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setStatus('connecting');
    setError(null);

    try {
      const ws = new WebSocket(wsEndpoint);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        setError(null);

        // Send ping heartbeat every 15 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const ticks = extractTicks(event.data);
          if (ticks.length > 0) {
            setLivePrices((prev) => {
              let changed = false;
              const next = { ...prev };
              for (const { id, ltp } of ticks) {
                if (next[id] !== ltp) {
                  next[id] = ltp;
                  changed = true;
                }
              }
              return changed ? next : prev;
            });
          }
        } catch (err) {
          console.warn('Market WS message parse warning:', err);
        }
      };

      ws.onerror = () => {
        setStatus('error');
        setError('Market Data WebSocket error');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Auto reconnect after 3 seconds if enabled and token present
        if (enabled && token) {
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to initialize Market WebSocket');
    }
  }, [enabled, token, wsEndpoint]);

  // Auto-connect on mount / token change
  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  // Reconcile and sync subscriptions (subscribing new & unsubscribing removed instruments)
  const syncSubscriptions = useCallback(async () => {
    if (!token) return;

    const currentMap = new Map<string, InstrumentSubscriptionItem>();
    for (const inst of validInstruments) {
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
    } catch (err: any) {
      console.warn('Market data subscription sync warning:', err.message);
      notify.apiError('Market Subscription Sync', err);
    } finally {
      setIsSubscribing(false);
    }
  }, [token, validInstruments]);

  // Debounced subscription reconciliation whenever valid instruments change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (token) {
      debounceTimerRef.current = setTimeout(() => {
        syncSubscriptions();
      }, 350);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [validInstruments, token, syncSubscriptions]);

  return {
    status,
    livePrices,
    isSubscribing,
    error,
    reconnect: connect,
    resubscribe: syncSubscriptions,
  };
}
