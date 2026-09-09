export type Segment = 1 | 2 | 3 | 11 | 12 | 13 | 51 | 'NSECM' | 'NSEFO' | 'NSECD' | 'BSECM' | 'BSEFO' | 'BSECD' | 'MCXFO';

export function toSegmentNumber(seg: Segment | number | string): number {
  if (typeof seg === 'number') return seg;
  const s = String(seg).toUpperCase().trim();
  switch (s) {
    case 'NSECM': return 1;
    case 'NSEFO': return 2;
    case 'NSECD': return 3;
    case 'BSECM': return 11;
    case 'BSEFO': return 12;
    case 'BSECD': return 13;
    case 'MCXFO': return 51;
    default:
      const n = Number(s);
      return isNaN(n) ? 1 : n;
  }
}

export interface LegRequest {
  leg_index?: number;
  exchange_segment: Segment | number;
  exchange_instrument_id: number;
  side: 'BUY' | 'SELL';
  lots: number;
  price?: number;
  entry_price?: number;
  quantity?: number;
  premium?: number;
}

export interface UnderlyingRequest {
  exchange_segment: Segment | number;
  exchange_instrument_id: number;
  spot?: number;
}

export interface StrategyRequest {
  userID?: string;
  underlying: UnderlyingRequest;
  target_date?: string; // YYYY-MM-DD
  legs: LegRequest[];
}

export interface UnderlyingResponse {
  exchange_segment: number;
  exchange_instrument_id: number;
  name: string;
  spot: number;
}

export interface LegGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  price?: number;
  implied_vol?: number;
  iv?: number;
  iv_percent?: number;
}

export interface LiveLegUpdate {
  leg_index?: number;
  exchange_segment: number;
  exchange_instrument_id: number;
  trading_symbol: string;
  name?: string;
  option_type: 'CE' | 'PE' | 'FUT' | 'EQ' | string;
  strike: number;
  expiry: string;
  side: 'BUY' | 'SELL' | string;
  lots: number;
  quantity: number;
  lot_size?: number;
  entry_price: number;
  ltp?: number;
  price?: number;
  pnl: number;
  iv: number;
  iv_percent: number;
  premium?: number;
  greeks?: LegGreeks;
}

export interface PortfolioGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  implied_vol: number;
  iv_percent: number;
}

export interface PayoffPoint {
  spot?: number;
  pnl?: number;
  at?: number;
  payoff?: number;
}

export interface BreakEven {
  spot: number;
  pnl?: number;
}

export interface PayoffRange {
  x_min: number;
  x_max: number;
}

export interface TargetPriceDefaults {
  min: number;
  max: number;
  default: number;
  step: number;
  closest_future_expiry?: string;
}

export interface TargetDateTimeDefaults {
  min?: string;
  max?: string;
  default?: string;
  timestamps?: string[];
  time_intervals?: string[];
}

export interface PayoffResult {
  net_premium: number;
  total_debit: number;
  total_credit: number;
  payoff_at_expiry: PayoffPoint[];
  payoff_at_target: PayoffPoint[];
  payoffs_at_expiry?: PayoffPoint[];
  payoffs_at_target?: PayoffPoint[];
  break_evens: (number | BreakEven)[];
  breakevens_at_target?: (number | BreakEven)[];
  projected_payoff?: number;
  standard_deviation?: number;
  strategy_name?: string;
  total_intrinsic_value?: number;
  total_time_value?: number;
  max_profit: number | null;
  max_loss: number | null;
  risk_reward: string;
  pop: number; // Probability of profit
  grid?: {
    from: number;
    to: number;
    step: number;
  };
  payoff_range?: PayoffRange;
  target_price_defaults?: TargetPriceDefaults;
  target_datetime?: string;
  target_datetime_defaults?: TargetDateTimeDefaults;
}

export interface MarginResult {
  is_valid?: boolean;
  required: number;
  final_margin?: number;
  hedge_benefit?: number;
  available_margin?: number;
  margin_shortfall?: number;
  strategy_type?: string;
  error_message?: string;
  raw?: any;
  error?: string;
}

export interface StrategyResponse {
  status?: string;
  user_id?: string;
  underlying?: UnderlyingResponse;
  legs?: LiveLegUpdate[];
  payoff?: PayoffResult;
  greeks?: PortfolioGreeks;
  margin?: MarginResult;
}

// WebSocket live payload received from backend
export interface LiveStrategyUpdate {
  underlying: UnderlyingResponse;
  live_pnl: number;
  total_value: number;
  legs: LiveLegUpdate[];
  greeks?: PortfolioGreeks;
  payoff?: PayoffResult;
}

export interface WSMessage<T = any> {
  event?: 'snapshot' | 'update' | 'authenticated' | 'unsubscribed' | 'pong' | 'error' | string;
  type?: string;
  timestamp?: string;
  seq?: number;
  data?: T;
  error?: string;
}
