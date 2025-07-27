import { useState, useEffect, useRef } from 'react';
import { 
  OrderbookEntry, 
  PressureZone, 
  UseOrderbookParams, 
  UseOrderbookReturn,
  WebSocketStatus,
  TimeRangeId,
  VenueId
} from '@/lib/types';
import * as binanceApi from '@/lib/binance';
import * as okxApi from '@/lib/okx';
import * as bybitApi from '@/lib/bybit';

// Time range in milliseconds
const TIME_RANGES: Record<TimeRangeId, number> = {
  '1m': 60 * 1000,
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '1h': 60 * 60 * 1000,
};

// Default symbols for each venue
const DEFAULT_SYMBOLS: Record<VenueId, string> = {
  'binance': 'btcusdt',
  'okx': 'BTC-USDT',
  'bybit': 'BTCUSDT'
};

// API functions for each venue
const API_FUNCTIONS: Record<VenueId, {
  createWebSocket: typeof binanceApi.createOrderbookWebSocket,
  fetchSnapshot: typeof binanceApi.fetchOrderbookSnapshot,
  detectPressureZones: typeof binanceApi.detectPressureZones
}> = {
  'binance': {
    createWebSocket: binanceApi.createOrderbookWebSocket,
    fetchSnapshot: binanceApi.fetchOrderbookSnapshot,
    detectPressureZones: binanceApi.detectPressureZones
  },
  'okx': {
    createWebSocket: okxApi.createOrderbookWebSocket,
    fetchSnapshot: okxApi.fetchOrderbookSnapshot,
    detectPressureZones: okxApi.detectPressureZones
  },
  'bybit': {
    createWebSocket: bybitApi.createOrderbookWebSocket,
    fetchSnapshot: bybitApi.fetchOrderbookSnapshot,
    detectPressureZones: bybitApi.detectPressureZones
  }
};

/**
 * Custom hook for managing orderbook data from multiple venues
 */
export default function useOrderbook({
  selectedVenues,
  timeRange,
  realTimeMode
}: UseOrderbookParams): UseOrderbookReturn {
  // State for orderbook data
  const [bids, setBids] = useState<OrderbookEntry[]>([]);
  const [asks, setAsks] = useState<OrderbookEntry[]>([]);
  const [pressureZones, setPressureZones] = useState<PressureZone[]>([]);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [maxQuantity, setMaxQuantity] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  
  // State for WebSocket connection
  const [status, setStatus] = useState<WebSocketStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  
  // Refs for WebSocket connections
  const wsRefs = useRef<Record<string, WebSocket | null>>({});
  
  // Ref for orderbook data buffer
  const dataBufferRef = useRef<OrderbookEntry[]>([]);
  
  // Function to reconnect WebSockets
  const reconnect = () => {
    // Close existing connections
    Object.values(wsRefs.current).forEach(ws => {
      if (ws) {
        ws.close();
      }
    });
    
    // Reset state
    setStatus('connecting');
    setError(null);
    
    // Reconnect
    initializeWebSockets();
  };
  
  // Function to initialize WebSocket connections
  const initializeWebSockets = async () => {
    try {
      let initialData: OrderbookEntry[] = [];
      
      // Fetch initial snapshots from all selected venues
      for (const venue of selectedVenues) {
        if (API_FUNCTIONS[venue]) {
          const venueData = await API_FUNCTIONS[venue].fetchSnapshot(
            DEFAULT_SYMBOLS[venue]
          );
          
          initialData = [...initialData, ...venueData];
        }
      }
      
      if (initialData.length > 0) {
        // Process initial data
        processOrderbookData(initialData);
        
        // Set up WebSocket connections for selected venues
        selectedVenues.forEach(venue => {
          if (API_FUNCTIONS[venue]) {
            const ws = API_FUNCTIONS[venue].createWebSocket(
              DEFAULT_SYMBOLS[venue],
              handleWebSocketMessage,
              handleWebSocketError
            );
            
            wsRefs.current[venue] = ws;
          }
        });
        
        setStatus('open');
      } else {
        setError('Failed to fetch initial orderbook data');
        setStatus('error');
      }
    } catch (err) {
      setError('Error initializing WebSocket connections');
      setStatus('error');
      console.error('Error initializing WebSockets:', err);
    }
  };
  
  // Handler for WebSocket messages
  const handleWebSocketMessage = (entries: OrderbookEntry[]) => {
    if (entries.length > 0) {
      // Add entries to buffer
      dataBufferRef.current = [...dataBufferRef.current, ...entries];
      
      // Process buffer if in real-time mode
      if (realTimeMode) {
        processOrderbookData(dataBufferRef.current);
      }
    }
  };
  
  // Handler for WebSocket errors
  const handleWebSocketError = (event: Event) => {
    setError('WebSocket connection error');
    setStatus('error');
    console.error('WebSocket error:', event);
  };
  
  // Function to process orderbook data
  const processOrderbookData = (entries: OrderbookEntry[]) => {
    if (entries.length === 0) return;
    
    // Filter entries by time range
    const now = Date.now();
    const timeRangeMs = TIME_RANGES[timeRange as TimeRangeId] || TIME_RANGES['1m'];
    const filteredEntries = entries.filter(entry => 
      now - entry.timestamp < timeRangeMs
    );
    
    // Separate bids and asks
    const newBids: OrderbookEntry[] = [];
    const newAsks: OrderbookEntry[] = [];
    
    // Calculate mid price for each venue to determine bids and asks
    const venueEntries: Record<VenueId, OrderbookEntry[]> = {};
    const venueMidPrices: Record<VenueId, number> = {};
    
    // Group entries by venue
    filteredEntries.forEach(entry => {
      if (!venueEntries[entry.venue]) {
        venueEntries[entry.venue] = [];
      }
      venueEntries[entry.venue].push(entry);
    });
    
    // Calculate mid price for each venue
    Object.entries(venueEntries).forEach(([venue, entries]) => {
      venueMidPrices[venue as VenueId] = entries.reduce((sum, e) => sum + e.price, 0) / entries.length;
    });
    
    // Separate bids and asks based on venue-specific mid price
    filteredEntries.forEach(entry => {
      const midPrice = venueMidPrices[entry.venue] || 
        filteredEntries.reduce((sum, e) => sum + e.price, 0) / filteredEntries.length;
      
      if (entry.price < midPrice) {
        newBids.push(entry);
      } else {
        newAsks.push(entry);
      }
    });
    
    // Sort bids (descending) and asks (ascending)
    newBids.sort((a, b) => b.price - a.price);
    newAsks.sort((a, b) => a.price - b.price);
    
    // Calculate min/max price and max quantity
    const allPrices = [...newBids, ...newAsks].map(entry => entry.price);
    const allQuantities = [...newBids, ...newAsks].map(entry => entry.quantity);
    
    const newMinPrice = Math.min(...allPrices);
    const newMaxPrice = Math.max(...allPrices);
    const newMaxQuantity = Math.max(...allQuantities);
    
    // Detect pressure zones using the appropriate function for each venue
    let allPressureZones: PressureZone[] = [];
    
    // Group entries by venue for pressure zone detection
    Object.entries(venueEntries).forEach(([venue, entries]) => {
      if (entries.length > 0 && API_FUNCTIONS[venue as VenueId]) {
        const { pressureZones } = API_FUNCTIONS[venue as VenueId].detectPressureZones(
          entries,
          newMaxQuantity * 0.2 // Use 20% of max quantity as threshold
        );
        allPressureZones = [...allPressureZones, ...pressureZones];
      }
    });
    
    // Sort pressure zones by score (descending)
    allPressureZones.sort((a, b) => b.pressureScore - a.pressureScore);
    
    // Update state
    setBids(newBids);
    setAsks(newAsks);
    setPressureZones(allPressureZones);
    setMinPrice(newMinPrice);
    setMaxPrice(newMaxPrice);
    setMaxQuantity(newMaxQuantity);
    setLastUpdated(now);
    
    // Clear buffer if processed
    if (realTimeMode) {
      dataBufferRef.current = [];
    }
  };
  
  // Initialize WebSockets on mount and when selected venues change
  useEffect(() => {
    initializeWebSockets();
    
    // Cleanup function
    return () => {
      Object.values(wsRefs.current).forEach(ws => {
        if (ws) {
          ws.close();
        }
      });
    };
  }, [selectedVenues]);
  
  // Process buffer periodically if not in real-time mode
  useEffect(() => {
    if (!realTimeMode) {
      const interval = setInterval(() => {
        if (dataBufferRef.current.length > 0) {
          processOrderbookData(dataBufferRef.current);
          dataBufferRef.current = [];
        }
      }, 1000); // Process every second
      
      return () => clearInterval(interval);
    }
  }, [realTimeMode, timeRange]);
  
  // Return orderbook data and status
  return {
    bids,
    asks,
    pressureZones,
    minPrice,
    maxPrice,
    maxQuantity,
    lastUpdated,
    status,
    error,
    reconnect
  };
}