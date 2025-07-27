import { OrderbookEntry, PressureZone } from './types';

// Bybit WebSocket URLs
const BYBIT_WS_BASE_URL = 'wss://stream.bybit.com/v5/public/spot';
const BYBIT_REST_BASE_URL = 'https://api.bybit.com/v5/market';

// Default symbol
const DEFAULT_SYMBOL = 'BTCUSDT';

/**
 * Creates a WebSocket connection to the Bybit API for orderbook data
 * @param symbol Trading pair symbol (e.g., 'BTCUSDT')
 * @param onMessage Callback function for handling messages
 * @param onError Callback function for handling errors
 * @returns WebSocket instance
 */
export function createOrderbookWebSocket(
  symbol: string = DEFAULT_SYMBOL,
  onMessage: (data: OrderbookEntry[]) => void,
  onError: (error: Event) => void
): WebSocket {
  const ws = new WebSocket(BYBIT_WS_BASE_URL);
  
  ws.onopen = () => {
    console.log(`Connected to Bybit WebSocket for ${symbol}`);
    
    // Subscribe to orderbook channel
    const subscribeMsg = {
      op: 'subscribe',
      args: [`orderbook.50.${symbol}`]
    };
    
    ws.send(JSON.stringify(subscribeMsg));
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      // Check if it's a data message (not a subscription confirmation)
      if (message.topic && message.topic.startsWith('orderbook') && message.data) {
        const data = message.data;
        const timestamp = message.ts;
        const entries: OrderbookEntry[] = [];
        
        // Process bids (buy orders)
        if (data.b && data.b.length > 0) {
          data.b.forEach((bid: string[]) => {
            const price = parseFloat(bid[0]);
            const quantity = parseFloat(bid[1]);
            
            if (quantity > 0) {
              entries.push({
                price,
                quantity,
                venue: 'bybit',
                timestamp
              });
            }
          });
        }
        
        // Process asks (sell orders)
        if (data.a && data.a.length > 0) {
          data.a.forEach((ask: string[]) => {
            const price = parseFloat(ask[0]);
            const quantity = parseFloat(ask[1]);
            
            if (quantity > 0) {
              entries.push({
                price,
                quantity,
                venue: 'bybit',
                timestamp
              });
            }
          });
        }
        
        // Send processed entries to callback
        if (entries.length > 0) {
          onMessage(entries);
        }
      }
    } catch (error) {
      console.error('Error parsing Bybit WebSocket message:', error);
    }
  };
  
  ws.onerror = onError;
  
  ws.onclose = () => {
    console.log(`Disconnected from Bybit WebSocket for ${symbol}`);
  };
  
  return ws;
}

/**
 * Fetches the initial orderbook snapshot from the Bybit REST API
 * @param symbol Trading pair symbol (e.g., 'BTCUSDT')
 * @param limit Number of price levels to fetch
 * @returns Promise with orderbook entries
 */
export async function fetchOrderbookSnapshot(
  symbol: string = DEFAULT_SYMBOL,
  limit: number = 50
): Promise<OrderbookEntry[]> {
  try {
    const response = await fetch(
      `${BYBIT_REST_BASE_URL}/orderbook?category=spot&symbol=${symbol}&limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.result || !data.result.b || !data.result.a) {
      throw new Error('No data in Bybit response');
    }
    
    const orderbook = data.result;
    const timestamp = Date.now(); // Bybit doesn't provide a timestamp in the response
    const entries: OrderbookEntry[] = [];
    
    // Process bids (buy orders)
    if (orderbook.b && orderbook.b.length > 0) {
      orderbook.b.forEach((bid: string[]) => {
        entries.push({
          price: parseFloat(bid[0]),
          quantity: parseFloat(bid[1]),
          venue: 'bybit',
          timestamp
        });
      });
    }
    
    // Process asks (sell orders)
    if (orderbook.a && orderbook.a.length > 0) {
      orderbook.a.forEach((ask: string[]) => {
        entries.push({
          price: parseFloat(ask[0]),
          quantity: parseFloat(ask[1]),
          venue: 'bybit',
          timestamp
        });
      });
    }
    
    return entries;
  } catch (error) {
    console.error('Error fetching Bybit orderbook snapshot:', error);
    return [];
  }
}

/**
 * Detects pressure zones in the orderbook (reusing the same algorithm as Binance)
 * @param entries Orderbook entries
 * @param threshold Minimum quantity for a pressure zone
 * @returns Array of pressure zones
 */
export function detectPressureZones(
  entries: OrderbookEntry[],
  threshold: number = 10
): { pressureZones: PressureZone[], maxQuantity: number } {
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
  const pressureZones: PressureZone[] = [];
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