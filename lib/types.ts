// Venue types
export type VenueId = 'binance' | 'okx' | 'bybit' | string;

// Time range types
export type TimeRangeId = '1m' | '5m' | '15m' | '1h';

// Orderbook entry type
export interface OrderbookEntry {
  price: number;
  quantity: number;
  venue: VenueId;
  timestamp: number;
}

// Pressure zone type
export interface PressureZone {
  minPrice: number;
  maxPrice: number;
  totalVolume: number;
  pressureScore: number;
  type: 'bid' | 'ask';
  entries: OrderbookEntry[];
}

// Orderbook data type
export interface OrderbookData {
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  pressureZones: PressureZone[];
  minPrice: number;
  maxPrice: number;
  maxQuantity: number;
  lastUpdated: number;
}

// WebSocket message types
export interface BinanceOrderbookMessage {
  lastUpdateId: number;
  bids: [string, string][]; // [price, quantity]
  asks: [string, string][]; // [price, quantity]
}

export interface BinanceDepthUpdateMessage {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  U: number; // First update ID in event
  u: number; // Final update ID in event
  b: [string, string][]; // Bids to be updated [price, quantity]
  a: [string, string][]; // Asks to be updated [price, quantity]
}

// WebSocket connection status
export type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

// Orderbook hook parameters
export interface UseOrderbookParams {
  selectedVenues: VenueId[];
  timeRange: TimeRangeId;
  realTimeMode: boolean;
}

// Orderbook hook return type
export interface UseOrderbookReturn extends OrderbookData {
  status: WebSocketStatus;
  error: string | null;
  reconnect: () => void;
}