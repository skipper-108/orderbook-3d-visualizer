import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import useOrderbook from '@/hooks/useOrderbook'
import { OrderbookEntry, PressureZone, TimeRangeId } from '@/lib/types'

interface ThreeSceneProps {
  selectedVenues: string[]
  priceRange: [number, number]
  quantityThreshold: number
  timeRange: TimeRangeId
  showPressureZones: boolean
  showOrderFlow: boolean
  realTimeMode: boolean
}

// Color mapping for different venues
const venueColors = {
  binance: '#F0B90B', // Binance yellow
  okx: '#1A1F36',     // OKX dark blue
  bybit: '#FFCC00',   // Bybit yellow
  // Add more venues as needed
}

// Main ThreeScene component
export default function ThreeScene({
  selectedVenues,
  priceRange,
  quantityThreshold,
  timeRange,
  showPressureZones,
  showOrderFlow,
  realTimeMode
}: ThreeSceneProps) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
        <axesHelper args={[5]} />
        <gridHelper args={[20, 20]} />
        <OrderbookVisualization 
          selectedVenues={selectedVenues}
          priceRange={priceRange}
          quantityThreshold={quantityThreshold}
          timeRange={timeRange}
          showPressureZones={showPressureZones}
          showOrderFlow={showOrderFlow}
          realTimeMode={realTimeMode}
        />
      </Canvas>
    </div>
  )
}

// Component for rendering the orderbook visualization
function OrderbookVisualization({
  selectedVenues,
  priceRange,
  quantityThreshold,
  timeRange,
  showPressureZones,
  showOrderFlow,
  realTimeMode
}: ThreeSceneProps) {
  const { scene } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  
  // Get orderbook data using custom hook
  const { 
    bids, 
    asks, 
    pressureZones,
    minPrice, 
    maxPrice, 
    maxQuantity 
  } = useOrderbook({
    selectedVenues,
    timeRange,
    realTimeMode
  })

  // Apply rotation animation
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Slow rotation around Y axis
      groupRef.current.rotation.y += delta * 0.1
    }
  })

  // Filter data based on user settings
  const filteredBids = bids.filter(bid => 
    (priceRange[0] === 0 || bid.price >= priceRange[0]) && 
    (priceRange[1] === 0 || bid.price <= priceRange[1]) &&
    (quantityThreshold === 0 || bid.quantity >= quantityThreshold)
  )
  
  const filteredAsks = asks.filter(ask => 
    (priceRange[0] === 0 || ask.price >= priceRange[0]) && 
    (priceRange[1] === 0 || ask.price <= priceRange[1]) &&
    (quantityThreshold === 0 || ask.quantity >= quantityThreshold)
  )

  // Scale factors for visualization
  const priceScale = 0.01
  const quantityScale = 0.5 / (maxQuantity || 1)
  const timeScale = 0.2

  // Add axis labels
  useEffect(() => {
    // Clear previous labels
    scene.children = scene.children.filter(child => 
      !(child.userData && child.userData.type === 'axisLabel')
    )
    
    // Add new labels
    const labelX = new THREE.Object3D()
    labelX.position.set(5, 0, 0)
    labelX.userData = { type: 'axisLabel' }
    scene.add(labelX)
    
    const labelY = new THREE.Object3D()
    labelY.position.set(0, 5, 0)
    labelY.userData = { type: 'axisLabel' }
    scene.add(labelY)
    
    const labelZ = new THREE.Object3D()
    labelZ.position.set(0, 0, 5)
    labelZ.userData = { type: 'axisLabel' }
    scene.add(labelZ)
    
    return () => {
      // Cleanup
      scene.children = scene.children.filter(child => 
        !(child.userData && child.userData.type === 'axisLabel')
      )
    }
  }, [scene])

  return (
    <group ref={groupRef}>
      {/* X-axis (Price) label */}
      <Text
        position={[5, -0.5, 0]}
        color="white"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
      >
        Price
      </Text>
      
      {/* Y-axis (Quantity) label */}
      <Text
        position={[-0.5, 5, 0]}
        color="white"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
        rotation={[0, 0, Math.PI / 2]}
      >
        Quantity
      </Text>
      
      {/* Z-axis (Time) label */}
      <Text
        position={[0, -0.5, 5]}
        color="white"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI / 2, 0]}
      >
        Time
      </Text>
      
      {/* Render bid bars */}
      {filteredBids.map((bid, index) => (
        <mesh 
          key={`bid-${bid.venue}-${bid.price}-${index}`}
          position={[
            bid.price * priceScale, 
            bid.quantity * quantityScale / 2, 
            -index * timeScale
          ]}
        >
          <boxGeometry 
            args={[
              0.05, // width (X)
              bid.quantity * quantityScale, // height (Y)
              0.1 // depth (Z)
            ]} 
          />
          <meshStandardMaterial 
            color={bid.venue && venueColors[bid.venue as keyof typeof venueColors] || 'green'} 
            opacity={0.7}
            transparent={true}
          />
          {/* Price label for significant bars */}
          {bid.quantity > maxQuantity * 0.5 && (
            <Html position={[0, bid.quantity * quantityScale + 0.2, 0]} center>
              <div className="bg-black bg-opacity-50 text-white px-1 py-0.5 rounded text-xs">
                {bid.price.toFixed(2)}
              </div>
            </Html>
          )}
        </mesh>
      ))}
      
      {/* Render ask bars */}
      {filteredAsks.map((ask, index) => (
        <mesh 
          key={`ask-${ask.venue}-${ask.price}-${index}`}
          position={[
            ask.price * priceScale, 
            ask.quantity * quantityScale / 2, 
            -index * timeScale
          ]}
        >
          <boxGeometry 
            args={[
              0.05, // width (X)
              ask.quantity * quantityScale, // height (Y)
              0.1 // depth (Z)
            ]} 
          />
          <meshStandardMaterial 
            color={ask.venue && venueColors[ask.venue as keyof typeof venueColors] || 'red'} 
            opacity={0.7}
            transparent={true}
          />
          {/* Price label for significant bars */}
          {ask.quantity > maxQuantity * 0.5 && (
            <Html position={[0, ask.quantity * quantityScale + 0.2, 0]} center>
              <div className="bg-black bg-opacity-50 text-white px-1 py-0.5 rounded text-xs">
                {ask.price.toFixed(2)}
              </div>
            </Html>
          )}
        </mesh>
      ))}
      
      {/* Render pressure zones */}
      {showPressureZones && pressureZones.map((zone, index) => (
        <mesh 
          key={`zone-${index}`}
          position={[
            ((zone.minPrice + zone.maxPrice) / 2) * priceScale, 
            zone.totalVolume * quantityScale / 4, 
            -index * timeScale * 0.5
          ]}
        >
          <boxGeometry 
            args={[
              (zone.maxPrice - zone.minPrice) * priceScale, 
              zone.totalVolume * quantityScale / 2, 
              2 * timeScale
            ]} 
          />
          <meshStandardMaterial 
            color={zone.type === 'bid' ? 'green' : 'red'} 
            opacity={0.3}
            transparent={true}
          />
          <Html position={[0, zone.totalVolume * quantityScale / 2 + 0.3, 0]} center>
            <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
              <div>Pressure: {zone.pressureScore.toFixed(2)}</div>
              <div>Volume: {zone.totalVolume.toFixed(2)}</div>
              <div>Range: {zone.minPrice.toFixed(2)} - {zone.maxPrice.toFixed(2)}</div>
            </div>
          </Html>
        </mesh>
      ))}
      
      {/* Price range indicators */}
      {priceRange[0] > 0 && (
        <mesh position={[priceRange[0] * priceScale, 0, 0]}>
          <boxGeometry args={[0.02, 10, 10]} />
          <meshStandardMaterial color="yellow" opacity={0.3} transparent={true} />
        </mesh>
      )}
      
      {priceRange[1] > 0 && (
        <mesh position={[priceRange[1] * priceScale, 0, 0]}>
          <boxGeometry args={[0.02, 10, 10]} />
          <meshStandardMaterial color="yellow" opacity={0.3} transparent={true} />
        </mesh>
      )}
    </group>
  )
}