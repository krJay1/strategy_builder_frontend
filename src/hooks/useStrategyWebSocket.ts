import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage, LiveStrategyUpdate } from '../types/strategy';

export type WSConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useStrategyWebSocket(
  token: string,
  userId: string,
  clientId: string,
  autoConnect = true
) {
  const [status, setStatus] = useState<WSConnectionStatus>('disconnected');
  const [snapshot, setSnapshot] = useState<LiveStrategyUpdate | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);

  const connect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setStatus('connecting');
    setError(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    // Clean token (strip Bearer if present)
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();

    // Construct WebSocket URL with Query Parameters
    const params = new URLSearchParams();
    if (userId) params.set('user_id', userId.trim());
    if (cleanToken) params.set('token', cleanToken);
    if (clientId) params.set('client_id', clientId.trim());

    const queryString = params.toString();
    const wsUrl = `${protocol}//${host}/ws/strategy${queryString ? '?' + queryString : ''}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        setError(null);

        // Also send auth action frame for compatibility
        if (cleanToken || userId) {
          ws.send(
            JSON.stringify({
              action: 'auth',
              token: cleanToken,
              user_id: userId,
              client_id: clientId,
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
          if ((eventName === 'snapshot' || eventName === 'update') && msg.data) {
            setSnapshot(msg.data);
            setError(null);
          } else if (eventName === 'error') {
            setError(msg.error || 'Unknown WS error');
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
  }, [token, userId, clientId]);

  const disconnect = useCallback(() => {
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  useEffect(() => {
    if (autoConnect && (token || userId)) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, token, userId, clientId, connect, disconnect]);

  return {
    status,
    snapshot,
    lastMessageTime,
    error,
    connect,
    disconnect,
  };
}
