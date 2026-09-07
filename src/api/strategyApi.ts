import axios from 'axios';
import { StrategyRequest, StrategyResponse } from '../types/strategy';
import { ENV } from '../config';

export interface UserCredentials {
  token: string;
  userId: string;
  clientId: string;
  apiUrl?: string;
  marketWsUrl?: string;
}

export interface InstrumentSubscriptionItem {
  exchangeSegment: number;
  exchangeInstrumentID: number;
}

export const getStoredCredentials = (): UserCredentials => {
  return {
    token: localStorage.getItem('sym_token') || ENV.DEFAULT_TOKEN,
    userId: localStorage.getItem('sym_user_id') || ENV.DEFAULT_USER_ID,
    clientId: localStorage.getItem('sym_client_id') || ENV.DEFAULT_CLIENT_ID,
    apiUrl: localStorage.getItem('api_url') || ENV.API_URL,
    marketWsUrl: localStorage.getItem('market_ws_url') || ENV.MARKET_WS_URL,
  };
};

export const saveCredentials = (creds: Partial<UserCredentials>) => {
  if (creds.token !== undefined) localStorage.setItem('sym_token', creds.token);
  if (creds.userId !== undefined) localStorage.setItem('sym_user_id', creds.userId);
  if (creds.clientId !== undefined) localStorage.setItem('sym_client_id', creds.clientId);
  if (creds.apiUrl !== undefined) localStorage.setItem('api_url', creds.apiUrl);
  if (creds.marketWsUrl !== undefined) localStorage.setItem('market_ws_url', creds.marketWsUrl);
};

export const createApiClient = (overrideBaseURL?: string) => {
  const creds = getStoredCredentials();
  const baseURL = overrideBaseURL !== undefined ? overrideBaseURL : (creds.apiUrl || ENV.API_URL || '');
  const token = creds.token.trim();
  const authHeader = token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '';

  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      ...(authHeader ? { Authorization: authHeader } : {}),
      'User-Id': creds.userId || ENV.DEFAULT_USER_ID,
      'Client-Id': creds.clientId || ENV.DEFAULT_CLIENT_ID,
    },
    timeout: 30000,
  });

  return client;
};

export interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
  error?: string;
}

export const strategyApi = {
  // POST /api/v2/strategy (Preview, Validate, Subscribe)
  createStrategy: async (req: StrategyRequest): Promise<StrategyResponse> => {
    const client = createApiClient();
    const res = await client.post<ApiResponse<StrategyResponse>>('/api/v2/strategy', req);
    return res.data.data;
  },

  // PUT /api/v2/strategy (Update Strategy)
  updateStrategy: async (req: StrategyRequest): Promise<StrategyResponse> => {
    const client = createApiClient();
    const res = await client.put<ApiResponse<StrategyResponse>>('/api/v2/strategy', req);
    return res.data.data;
  },

  // DELETE /api/v2/strategy (Unsubscribe)
  unsubscribeStrategy: async (): Promise<any> => {
    const client = createApiClient();
    const res = await client.delete<ApiResponse<any>>('/api/v2/strategy');
    return res.data;
  },

  // POST /api/v1/symphony/apibinarymarketdata/instruments/subscription (Symphony Market Data Pre-Subscription)
  // Base URL: configured Symphony API URL (default: https://uat.firstdemat.in)
  subscribeMarketData: async (instruments: InstrumentSubscriptionItem[]): Promise<any> => {
    if (!instruments || instruments.length === 0) return;
    const creds = getStoredCredentials();
    const baseURL = creds.apiUrl?.trim() || ENV.SYMPHONY_API_URL;
    const client = createApiClient(baseURL);
    const res = await client.post<any>(
      '/api/v1/symphony/apibinarymarketdata/instruments/subscription',
      {
        instruments,
        xtsMessageCode: 1501,
      }
    );
    return res.data;
  },

  // PUT /api/v1/symphony/apibinarymarketdata/instruments/subscription (Symphony Market Data Unsubscribe)
  // Base URL: configured Symphony API URL (default: https://uat.firstdemat.in)
  unsubscribeMarketData: async (instruments: InstrumentSubscriptionItem[]): Promise<any> => {
    if (!instruments || instruments.length === 0) return;
    const creds = getStoredCredentials();
    const baseURL = creds.apiUrl?.trim() || ENV.SYMPHONY_API_URL;
    const client = createApiClient(baseURL);
    const res = await client.put<any>(
      '/api/v1/symphony/apibinarymarketdata/instruments/subscription',
      {
        instruments,
        xtsMessageCode: 1501,
      }
    );
    return res.data;
  },
};
