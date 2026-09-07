/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SYMPHONY_API_URL?: string;
  readonly VITE_MARKET_WS_URL?: string;
  readonly VITE_STRATEGY_WS_URL?: string;
  readonly VITE_DEFAULT_USER_ID?: string;
  readonly VITE_DEFAULT_CLIENT_ID?: string;
  readonly VITE_DEFAULT_TOKEN?: string;
  readonly VITE_DEFAULT_UNDERLYING_SEGMENT?: string;
  readonly VITE_DEFAULT_UNDERLYING_ID?: string;
  readonly VITE_DEFAULT_UNDERLYING_SPOT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
