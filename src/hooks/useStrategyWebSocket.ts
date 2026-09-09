import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, LiveStrategyUpdate } from '../types/strategy';
import { notify } from '../utils/toast';
import { ENV } from '../config';

export type WSConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useStrategyWebSocket(
  token: string,
  userId: string,
  autoConnect = true,
  strategyWsUrl?: string
) {
  const [status, setStatus] = useState<WSConnectionStatus>('disconnected');
  const [snapshot, setSnapshot] = useState<LiveStrategyUpdate | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);
  const lastSeqRef = useRef<number>(0);

  const connect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setStatus('connecting');
    setError(null);
    lastSeqRef.current = 0;

    // Clean token (strip Bearer if present)
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const effectiveUserId = (userId || ENV.DEFAULT_USER_ID).trim();

    let baseWsUrl = strategyWsUrl?.trim() || ENV.STRATEGY_WS_URL;
    if (!baseWsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      baseWsUrl = `${protocol}//${host}/ws/strategy`;
    }

    let wsUrl = '';
    try {
      const parsed = new URL(baseWsUrl, window.location.origin);
      if (effectiveUserId) {
        parsed.searchParams.set('User-Id', effectiveUserId);
        parsed.searchParams.set('user_id', effectiveUserId);
      }
      if (cleanToken) {
        parsed.searchParams.set('Access-Token', cleanToken);
        parsed.searchParams.set('token', cleanToken);
      }
      parsed.searchParams.delete('client_id');
      parsed.searchParams.delete('Client-Id');
      wsUrl = parsed.toString();
    } catch {
      const params = new URLSearchParams();
      if (effectiveUserId) {
        params.set('User-Id', effectiveUserId);
        params.set('user_id', effectiveUserId);
      }
      if (cleanToken) {
        params.set('Access-Token', cleanToken);
        params.set('token', cleanToken);
      }
      const queryString = params.toString();
      wsUrl = `${baseWsUrl}${queryString ? (baseWsUrl.includes('?') ? '&' : '?') + queryString : ''}`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        setError(null);

        // Send auth action frame with token and user_id (no client_id required)
        if (cleanToken || effectiveUserId) {
          ws.send(
            JSON.stringify({
              action: 'auth',
              token: cleanToken,
              user_id: effectiveUserId,
            })
          );
        }

        // Start ping heartbeat
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage<LiveStrategyUpdate> = JSON.parse(event.data);
          setLastMessageTime(new Date());

          const eventName = (msg.event || msg.type || '').toLowerCase();
          if (eventName === 'snapshot' && msg.data) {
            lastSeqRef.current = msg.seq || 0;
            setSnapshot(msg.data);
            setError(null);
          } else if (eventName === 'update' && msg.data) {
            // Drop stale or out-of-order frames using monotonic sequence number
            if (msg.seq && lastSeqRef.current && msg.seq <= lastSeqRef.current) {
              return;
            }
            if (msg.seq) {
              lastSeqRef.current = msg.seq;
            }
            setSnapshot(msg.data);
            setError(null);
          } else if (eventName === 'unsubscribed') {
            setSnapshot(null);
            lastSeqRef.current = 0;
          } else if (eventName === 'error') {
            const errText = msg.error || (msg as any).message || 'Strategy stream error';
            setError(errText);
            notify.error('Strategy Feed Error', errText);
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('Strategy WS error:', e);
        setStatus('error');
        setError('WebSocket error occurred');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      };
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to initialize WebSocket');
    }
  }, [token, userId, strategyWsUrl]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    lastSeqRef.current = 0;
    setStatus('disconnected');
  }, []);

  const clearSnapshot = useCallback(() => {
    setSnapshot(null);
    lastSeqRef.current = 0;
    setError(null);
  }, []);

  useEffect(() => {
    if (autoConnect && (token || userId)) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, token, userId, strategyWsUrl, connect, disconnect]);

  return {
    status,
    snapshot,
    lastMessageTime,
    error,
    connect,
    disconnect,
    clearSnapshot,
  };
}
