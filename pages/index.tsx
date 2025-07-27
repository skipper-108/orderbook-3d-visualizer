import Head from 'next/head'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import ControlPanel from '@/components/ControlPanel'
import { TimeRangeId } from '@/lib/types'

// Dynamically import ThreeScene with no SSR to avoid server-side rendering issues with Three.js
const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false })

export default function Home() {
  const [selectedVenues, setSelectedVenues] = useState<string[]>(['binance'])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0])
  const [quantityThreshold, setQuantityThreshold] = useState<number>(0)
  const [timeRange, setTimeRange] = useState<TimeRangeId>('1m')
  const [showPressureZones, setShowPressureZones] = useState<boolean>(true)
  const [showOrderFlow, setShowOrderFlow] = useState<boolean>(true)
  const [realTimeMode, setRealTimeMode] = useState<boolean>(true)
  const [searchPrice, setSearchPrice] = useState<number | null>(null)

  return (
    <>
      <Head>
        <title>Orderbook Depth 3D Visualizer</title>
        <meta name="description" content="3D visualization of cryptocurrency orderbooks" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center">
        <h1 className="text-4xl font-bold mt-8 mb-4">Orderbook Depth 3D Visualizer</h1>
        
        <div className="w-full flex flex-col lg:flex-row">
          <div className="w-full lg:w-3/4 h-[70vh]">
            <ThreeScene 
              selectedVenues={selectedVenues}
              priceRange={priceRange}
              quantityThreshold={quantityThreshold}
              timeRange={timeRange}
              showPressureZones={showPressureZones}
              showOrderFlow={showOrderFlow}
              realTimeMode={realTimeMode}
              searchPrice={searchPrice}
            />
          </div>
          
          <div className="w-full lg:w-1/4 p-4">
            <ControlPanel 
              selectedVenues={selectedVenues}
              setSelectedVenues={setSelectedVenues}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              quantityThreshold={quantityThreshold}
              setQuantityThreshold={setQuantityThreshold}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              showPressureZones={showPressureZones}
              setShowPressureZones={setShowPressureZones}
              showOrderFlow={showOrderFlow}
              setShowOrderFlow={setShowOrderFlow}
              realTimeMode={realTimeMode}
              setRealTimeMode={setRealTimeMode}
              searchPrice={searchPrice}
              setSearchPrice={setSearchPrice}
            />
          </div>
        </div>
      </main>
    </>
  )
}