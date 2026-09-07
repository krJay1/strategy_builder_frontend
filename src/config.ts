/**
 * Central Environment Configuration
 * Reads from Vite environment variables (import.meta.env) with production-ready fallbacks.
 */
export const ENV = {
  // Strategy Builder API Base URL (leave empty in dev to use Vite proxy / relative path)
  API_URL: (import.meta.env.VITE_API_URL || '').trim(),

  // Symphony Master / Proxy API Base URL (for market data pre-subscription / master queries)
  SYMPHONY_API_URL: (import.meta.env.VITE_SYMPHONY_API_URL || 'https://uat.firstdemat.in').trim(),

  // Real-Time Market Data WebSocket URL (socket-service)
  MARKET_WS_URL: (import.meta.env.VITE_MARKET_WS_URL || '').trim(),

  // Real-Time Strategy MTM Calculation WebSocket URL (strategy-builder)
  STRATEGY_WS_URL: (import.meta.env.VITE_STRATEGY_WS_URL || '').trim(),

  // Default User Credentials & Tokens
  DEFAULT_USER_ID: (import.meta.env.VITE_DEFAULT_USER_ID || 'AA002').trim(),
  DEFAULT_CLIENT_ID: (import.meta.env.VITE_DEFAULT_CLIENT_ID || 'AA002').trim(),
  DEFAULT_TOKEN: (import.meta.env.VITE_DEFAULT_TOKEN || '').trim(),

  // Default Initial Underlying Configuration
  DEFAULT_UNDERLYING_SEGMENT: Number(import.meta.env.VITE_DEFAULT_UNDERLYING_SEGMENT) || 1, // 1: NSECM
  DEFAULT_UNDERLYING_ID: Number(import.meta.env.VITE_DEFAULT_UNDERLYING_ID) || 2885, // 2885: RELIANCE
  DEFAULT_UNDERLYING_SPOT: Number(import.meta.env.VITE_DEFAULT_UNDERLYING_SPOT) || 1309.1,
};
