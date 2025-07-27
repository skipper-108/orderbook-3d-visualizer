import { OrderbookEntry, BinanceOrderbookMessage, BinanceDepthUpdateMessage } from './types';

// Binance WebSocket URLs
const BINANCE_WS_BASE_URL = 'wss://stream.binance.com:9443/ws';
const BINANCE_REST_BASE_URL = 'https://api.binance.com/api/v3';

// Default symbol
const DEFAULT_SYMBOL = 'btcusdt';

/**
 * Creates a WebSocket connection to the Binance API for orderbook data
 * @param symbol Trading pair symbol (e.g., 'btcusdt')
 * @param onMessage Callback function for handling messages
 * @param onError Callback function for handling errors
 * @returns WebSocket instance
 */
export function createOrderbookWebSocket(
  symbol: string = DEFAULT_SYMBOL,
  onMessage: (data: OrderbookEntry[]) => void,
  onError: (error: Event) => void
): WebSocket {
  const ws = new WebSocket(`${BINANCE_WS_BASE_URL}/${symbol}@depth`);
  
  ws.onopen = () => {
    console.log(`Connected to Binance WebSocket for ${symbol}`);
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as BinanceDepthUpdateMessage;
      
      // Process bids and asks
      const entries: OrderbookEntry[] = [];
      
      // Process bids (buy orders)
      message.b.forEach(([price, quantity]) => {
        const numPrice = parseFloat(price);
        const numQuantity = parseFloat(quantity);
        
        // Skip orders with 0 quantity (deletions)
        if (numQuantity > 0) {
          entries.push({
            price: numPrice,
            quantity: numQuantity,
            venue: 'binance',
            timestamp: message.E
          });
        }
      });
      
      // Process asks (sell orders)
      message.a.forEach(([price, quantity]) => {
        const numPrice = parseFloat(price);
        const numQuantity = parseFloat(quantity);
        
        // Skip orders with 0 quantity (deletions)
        if (numQuantity > 0) {
          entries.push({
            price: numPrice,
            quantity: numQuantity,
            venue: 'binance',
            timestamp: message.E
          });
        }
      });
      
      // Send processed entries to callback
      onMessage(entries);
    } catch (error) {
      console.error('Error parsing Binance WebSocket message:', error);
    }
  };
  
  ws.onerror = onError;
  
  ws.onclose = () => {
    console.log(`Disconnected from Binance WebSocket for ${symbol}`);
  };
  
  return ws;
}

/**
 * Fetches the initial orderbook snapshot from the Binance REST API
 * @param symbol Trading pair symbol (e.g., 'btcusdt')
 * @param limit Number of price levels to fetch (max 5000)
 * @returns Promise with orderbook entries
 */
export async function fetchOrderbookSnapshot(
  symbol: string = DEFAULT_SYMBOL,
  limit: number = 100
): Promise<OrderbookEntry[]> {
  try {
    const response = await fetch(
      `${BINANCE_REST_BASE_URL}/depth?symbol=${symbol.toUpperCase()}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json() as BinanceOrderbookMessage;
    const timestamp = Date.now();
    const entries: OrderbookEntry[] = [];
    
    // Process bids (buy orders)
    data.bids.forEach(([price, quantity]) => {
      entries.push({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        venue: 'binance',
        timestamp
      });
    });
    
    // Process asks (sell orders)
    data.asks.forEach(([price, quantity]) => {
      entries.push({
        price: parseFloat(price),
        quantity: parseFloat(quantity),
        venue: 'binance',
        timestamp
      });
    });
    
    return entries;
  } catch (error) {
    console.error('Error fetching orderbook snapshot:', error);
    return [];
  }
}

/**
 * Detects pressure zones in the orderbook
 * @param entries Orderbook entries
 * @param threshold Minimum quantity for a pressure zone
 * @returns Array of pressure zones
 */
export function detectPressureZones(
  entries: OrderbookEntry[],
  threshold: number = 10
): { pressureZones: any[], maxQuantity: number } {
  // Group entries by price (rounded to nearest integer)
  const priceGroups: Record<number, OrderbookEntry[]> = {};
  let maxQuantity = 0;
  
  entries.forEach(entry => {
    const roundedPrice = Math.round(entry.price);
    
    if (!priceGroups[roundedPrice]) {
      priceGroups[roundedPrice] = [];
    }
    
    priceGroups[roundedPrice].push(entry);
    
    // Track maximum quantity for scaling
    if (entry.quantity > maxQuantity) {
      maxQuantity = entry.quantity;
    }
  });
  
  // Find clusters of prices with high volume
  const pressureZones: any[] = [];
  const processedPrices = new Set<number>();
  
  Object.keys(priceGroups).forEach(priceStr => {
    const price = parseInt(priceStr, 10);
    
    if (processedPrices.has(price)) {
      return;
    }
    
    const group = priceGroups[price];
    const totalVolume = group.reduce((sum, entry) => sum + entry.quantity, 0);
    
    // Check if this price level meets the threshold
    if (totalVolume >= threshold) {
      // Look for adjacent price levels to form a zone
      let minPrice = price;
      let maxPrice = price;
      let zoneVolume = totalVolume;
      const zoneEntries = [...group];
      
      // Check lower prices
      for (let p = price - 1; p >= price - 5; p--) {
        if (priceGroups[p]) {
          const pVolume = priceGroups[p].reduce((sum, entry) => sum + entry.quantity, 0);
          if (pVolume >= threshold * 0.5) {
            minPrice = p;
            zoneVolume += pVolume;
            zoneEntries.push(...priceGroups[p]);
            processedPrices.add(p);
          } else {
            break;
          }
        }
      }
      
      // Check higher prices
      for (let p = price + 1; p <= price + 5; p++) {
        if (priceGroups[p]) {
          const pVolume = priceGroups[p].reduce((sum, entry) => sum + entry.quantity, 0);
          if (pVolume >= threshold * 0.5) {
            maxPrice = p;
            zoneVolume += pVolume;
            zoneEntries.push(...priceGroups[p]);
            processedPrices.add(p);
          } else {
            break;
          }
        }
      }
      
      // Determine if this is a bid or ask zone
      const type = zoneEntries[0].price < entries.reduce((sum, entry) => sum + entry.price, 0) / entries.length
        ? 'bid'
        : 'ask';
      
      // Calculate pressure score based on volume and price range
      const pressureScore = zoneVolume * (maxPrice - minPrice + 1);
      
      pressureZones.push({
        minPrice,
        maxPrice,
        totalVolume: zoneVolume,
        pressureScore,
        type,
        entries: zoneEntries
      });
      
      processedPrices.add(price);
    }
  });
  
  // Sort pressure zones by score (descending)
  pressureZones.sort((a, b) => b.pressureScore - a.pressureScore);
  
  return { pressureZones, maxQuantity };
}