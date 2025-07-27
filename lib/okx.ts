import { OrderbookEntry, PressureZone } from './types';

// OKX WebSocket URLs
const OKX_WS_BASE_URL = 'wss://ws.okx.com:8443/ws/v5/public';
const OKX_REST_BASE_URL = 'https://www.okx.com/api/v5/market';

// Default symbol
const DEFAULT_SYMBOL = 'BTC-USDT';

/**
 * Creates a WebSocket connection to the OKX API for orderbook data
 * @param symbol Trading pair symbol (e.g., 'BTC-USDT')
 * @param onMessage Callback function for handling messages
 * @param onError Callback function for handling errors
 * @returns WebSocket instance
 */
export function createOrderbookWebSocket(
  symbol: string = DEFAULT_SYMBOL,
  onMessage: (data: OrderbookEntry[]) => void,
  onError: (error: Event) => void
): WebSocket {
  const ws = new WebSocket(OKX_WS_BASE_URL);
  
  ws.onopen = () => {
    console.log(`Connected to OKX WebSocket for ${symbol}`);
    
    // Subscribe to orderbook channel
    const subscribeMsg = {
      op: 'subscribe',
      args: [
        {
          channel: 'books',
          instId: symbol
        }
      ]
    };
    
    ws.send(JSON.stringify(subscribeMsg));
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      // Check if it's a data message (not a subscription confirmation)
      if (message.data && message.data.length > 0) {
        const data = message.data[0];
        const timestamp = new Date(data.ts).getTime();
        const entries: OrderbookEntry[] = [];
        
        // Process bids (buy orders)
        if (data.bids && data.bids.length > 0) {
          data.bids.forEach((bid: string[]) => {
            const price = parseFloat(bid[0]);
            const quantity = parseFloat(bid[1]);
            
            if (quantity > 0) {
              entries.push({
                price,
                quantity,
                venue: 'okx',
                timestamp
              });
            }
          });
        }
        
        // Process asks (sell orders)
        if (data.asks && data.asks.length > 0) {
          data.asks.forEach((ask: string[]) => {
            const price = parseFloat(ask[0]);
            const quantity = parseFloat(ask[1]);
            
            if (quantity > 0) {
              entries.push({
                price,
                quantity,
                venue: 'okx',
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
      console.error('Error parsing OKX WebSocket message:', error);
    }
  };
  
  ws.onerror = onError;
  
  ws.onclose = () => {
    console.log(`Disconnected from OKX WebSocket for ${symbol}`);
  };
  
  return ws;
}

/**
 * Fetches the initial orderbook snapshot from the OKX REST API
 * @param symbol Trading pair symbol (e.g., 'BTC-USDT')
 * @param limit Number of price levels to fetch
 * @returns Promise with orderbook entries
 */
export async function fetchOrderbookSnapshot(
  symbol: string = DEFAULT_SYMBOL,
  limit: number = 100
): Promise<OrderbookEntry[]> {
  try {
    const response = await fetch(
      `${OKX_REST_BASE_URL}/books?instId=${symbol}&sz=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No data in OKX response');
    }
    
    const orderbook = data.data[0];
    const timestamp = new Date(orderbook.ts).getTime();
    const entries: OrderbookEntry[] = [];
    
    // Process bids (buy orders)
    if (orderbook.bids && orderbook.bids.length > 0) {
      orderbook.bids.forEach((bid: string[]) => {
        entries.push({
          price: parseFloat(bid[0]),
          quantity: parseFloat(bid[1]),
          venue: 'okx',
          timestamp
        });
      });
    }
    
    // Process asks (sell orders)
    if (orderbook.asks && orderbook.asks.length > 0) {
      orderbook.asks.forEach((ask: string[]) => {
        entries.push({
          price: parseFloat(ask[0]),
          quantity: parseFloat(ask[1]),
          venue: 'okx',
          timestamp
        });
      });
    }
    
    return entries;
  } catch (error) {
    console.error('Error fetching OKX orderbook snapshot:', error);
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