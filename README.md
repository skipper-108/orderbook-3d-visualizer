# Orderbook Depth 3D Visualizer

A 3D Next.js + Three.js visualization of live cryptocurrency orderbooks with venue filtering and pressure zone analysis.

## Features

- 3D price/quantity/time visualization using Three.js and React Three Fiber
- Real-time Binance WebSocket integration
- Multi-venue filtering (Binance, OKX, Bybit)
- Pressure zone detection and visualization
- Interactive controls for filtering and customization
- Responsive design with Tailwind CSS

## Setup & Run Instructions

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/orderbook-3d-visualizer
cd orderbook-3d-visualizer
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:3000`

## APIs Used

- **Binance WebSocket API**: Used for real-time orderbook data
  - WebSocket endpoint: `wss://stream.binance.com:9443/ws/btcusdt@depth`
  - REST API endpoint for initial snapshot: `https://api.binance.com/api/v3/depth`

## Technical Architecture

### Frontend Framework

- **Next.js**: React framework for server-rendered applications
- **TypeScript**: For type safety and better developer experience

### State Management

- **Zustand**: Lightweight state management solution
- **React Hooks**: Custom hooks for managing orderbook data and WebSocket connections

### 3D Visualization

- **Three.js**: JavaScript 3D library
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers for React Three Fiber

### Styling

- **Tailwind CSS**: Utility-first CSS framework for rapid UI development

### Data Flow

1. WebSocket connections are established with selected venues (Binance, etc.)
2. Orderbook data is processed and formatted for visualization
3. Pressure zones are detected based on volume clusters
4. 3D visualization is rendered with React Three Fiber
5. User interactions update the visualization in real-time

## Assumptions

- The application assumes a stable internet connection for WebSocket data
- Default trading pair is BTC/USDT
- The application is designed for desktop use primarily, but is responsive for mobile
- Pressure zone detection is based on volume clusters and may not reflect actual market dynamics
- The application does not include authentication or trading functionality

## Key Files

- `pages/index.tsx`: Main application page with layout and state management
- `components/ThreeScene.tsx`: 3D visualization component using React Three Fiber
- `components/ControlPanel.tsx`: Interactive controls for filtering and customization
- `hooks/useOrderbook.ts`: Custom hook for managing orderbook data
- `lib/binance.ts`: Binance WebSocket API integration
- `lib/types.ts`: TypeScript type definitions

## Performance Considerations

- WebSocket data is buffered and processed in batches to avoid rendering bottlenecks
- Three.js optimizations are applied for smooth 60fps rendering
- Level-of-detail (LOD) rendering is used for complex scenes
- Old data is purged to avoid memory bloat

## Future Enhancements

- Add more venues (exchanges)
- Implement trade execution visualization
- Add historical data mode with playback controls
- Implement machine learning for predictive pressure zone analysis
- Add more advanced visualization features (heatmaps, volume profile, etc.)"# orderbook-3d-visualizer" 
