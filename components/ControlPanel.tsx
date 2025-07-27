import { useState, useEffect } from 'react'
import { TimeRangeId } from '@/lib/types'

interface ControlPanelProps {
  selectedVenues: string[]
  setSelectedVenues: (venues: string[]) => void
  priceRange: [number, number]
  setPriceRange: (range: [number, number]) => void
  quantityThreshold: number
  setQuantityThreshold: (threshold: number) => void
  timeRange: TimeRangeId
  setTimeRange: (range: TimeRangeId) => void
  showPressureZones: boolean
  setShowPressureZones: (show: boolean) => void
  showOrderFlow: boolean
  setShowOrderFlow: (show: boolean) => void
  realTimeMode: boolean
  setRealTimeMode: (mode: boolean) => void
  searchPrice: number | null
  setSearchPrice: (price: number | null) => void
}

// Available venues
const availableVenues = [
  { id: 'binance', name: 'Binance', color: '#F0B90B' },
  { id: 'okx', name: 'OKX', color: '#1A1F36' },
  { id: 'bybit', name: 'Bybit', color: '#FFCC00' },
  // Add more venues as needed
]

// Available time ranges
const timeRanges = [
  { id: '1m', name: '1 Minute' },
  { id: '5m', name: '5 Minutes' },
  { id: '15m', name: '15 Minutes' },
  { id: '1h', name: '1 Hour' },
]

export default function ControlPanel({
  selectedVenues,
  setSelectedVenues,
  priceRange,
  setPriceRange,
  quantityThreshold,
  setQuantityThreshold,
  timeRange,
  setTimeRange,
  showPressureZones,
  setShowPressureZones,
  showOrderFlow,
  setShowOrderFlow,
  realTimeMode,
  setRealTimeMode
}: ControlPanelProps) {
  // Local state for price input
  const [minPriceInput, setMinPriceInput] = useState<string>(priceRange[0] ? priceRange[0].toString() : '')
  const [maxPriceInput, setMaxPriceInput] = useState<string>(priceRange[1] ? priceRange[1].toString() : '')
  const [searchPrice, setSearchPrice] = useState<string>('')
  
  // Update local state when props change
  useEffect(() => {
    setMinPriceInput(priceRange[0] ? priceRange[0].toString() : '')
    setMaxPriceInput(priceRange[1] ? priceRange[1].toString() : '')
  }, [priceRange])
  
  // Handle venue selection
  const handleVenueChange = (venueId: string) => {
    if (selectedVenues.includes(venueId)) {
      setSelectedVenues(selectedVenues.filter(v => v !== venueId))
    } else {
      setSelectedVenues([...selectedVenues, venueId])
    }
  }
  
  // Handle price range input
  const handlePriceRangeSubmit = () => {
    const min = parseFloat(minPriceInput) || 0
    const max = parseFloat(maxPriceInput) || 0
    setPriceRange([min, max])
  }
  
  // Handle search price submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const price = parseFloat(searchPrice)
    if (!isNaN(price) && price > 0) {
      // Set the search price in the parent component
      setSearchPrice(price)
      // Clear the local input
      setSearchPrice('')
    }
  }

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Control Panel</h2>
      
      {/* Venue Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Venues</h3>
        <div className="space-y-2">
          {availableVenues.map(venue => (
            <div key={venue.id} className="flex items-center">
              <input
                type="checkbox"
                id={`venue-${venue.id}`}
                checked={selectedVenues.includes(venue.id)}
                onChange={() => handleVenueChange(venue.id)}
                className="mr-2"
              />
              <label 
                htmlFor={`venue-${venue.id}`}
                className="flex items-center"
              >
                <span 
                  className="inline-block w-3 h-3 mr-2 rounded-full" 
                  style={{ backgroundColor: venue.color }}
                ></span>
                {venue.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Price Range */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Price Range</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="min-price" className="block text-sm">Min Price</label>
            <input
              type="number"
              id="min-price"
              value={minPriceInput}
              onChange={(e) => setMinPriceInput(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded"
            />
          </div>
          <div>
            <label htmlFor="max-price" className="block text-sm">Max Price</label>
            <input
              type="number"
              id="max-price"
              value={maxPriceInput}
              onChange={(e) => setMaxPriceInput(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded"
            />
          </div>
        </div>
        <button 
          onClick={handlePriceRangeSubmit}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded"
        >
          Apply
        </button>
      </div>
      
      {/* Quantity Threshold */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Quantity Threshold</h3>
        <input
          type="range"
          min="0"
          max="100"
          value={quantityThreshold}
          onChange={(e) => setQuantityThreshold(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm">
          <span>0</span>
          <span>{quantityThreshold}</span>
          <span>100</span>
        </div>
      </div>
      
      {/* Time Range */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Time Range</h3>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRangeId)}
          className="w-full bg-gray-700 text-white p-2 rounded"
        >
          {timeRanges.map(range => (
            <option key={range.id} value={range.id}>
              {range.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* Toggles */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Display Options</h3>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="pressure-zones"
              checked={showPressureZones}
              onChange={(e) => setShowPressureZones(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="pressure-zones">Show Pressure Zones</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="order-flow"
              checked={showOrderFlow}
              onChange={(e) => setShowOrderFlow(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="order-flow">Show Order Flow</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="real-time"
              checked={realTimeMode}
              onChange={(e) => setRealTimeMode(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="real-time">Real-time Mode</label>
          </div>
        </div>
      </div>
      
      {/* Price Search */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Jump to Price</h3>
        <form onSubmit={handleSearchSubmit} className="flex">
          <input
            type="number"
            value={searchPrice}
            onChange={(e) => setSearchPrice(e.target.value)}
            placeholder="Enter price..."
            className="flex-grow bg-gray-700 text-white p-2 rounded-l"
          />
          <button 
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-r"
          >
            Go
          </button>
        </form>
      </div>
      
      {/* Legend */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Legend</h3>
        <div className="space-y-1">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 mr-2 rounded-full bg-green-500"></span>
            <span>Bids</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 mr-2 rounded-full bg-red-500"></span>
            <span>Asks</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 mr-2 rounded-full bg-yellow-500"></span>
            <span>Pressure Zones</span>
          </div>
        </div>
      </div>
    </div>
  )
}