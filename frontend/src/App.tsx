import { useEffect, useState } from 'react'
import { MapContainer, ImageOverlay, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type{ Feature } from 'geojson'

// SVGサイズに合わせて座標系を定義
const width = 1600
const height = 2000
const bounds: L.LatLngBoundsExpression = [[0, 0], [height, width]]

export default function App() {
  const [features, setFeatures] = useState<Feature[]>([])

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/floors/1F/devices')
      .then(res => res.json())
      .then(geojson => {
        console.log('取得したGeoJSON:', geojson)
        if (geojson && geojson.features) {
          setFeatures(geojson.features)
        }
      })
      .catch(err => console.error('GeoJSON取得エラー:', err))
  }, [])

  return (
    <MapContainer
      crs={L.CRS.Simple}
      bounds={bounds}
      maxZoom={3}
      minZoom={-1}
      style={{ height: '100vh', width: '100vw' }}
    >
      <ImageOverlay url="/CTS2.svg" bounds={bounds} />

      {/* サンプルマーカー */}
      <Marker position={[800, 700]}>
        <Popup>ここに何かある！</Popup>
      </Marker>

      {/* GeoJSONの各Featureをマーカーで表示 */}
      {features.map((feature, idx) => {
        // Pointのみ対応
        if (feature.geometry.type === 'Point') {
          const [x, y] = feature.geometry.coordinates
          return (
            <Marker key={idx} position={[y, x]}>
              <Popup>
                {Object.entries(feature.properties ?? {}).map(([key, value]) => (
                  <div key={key}>
                    <strong>{key}:</strong> {String(value)}
                  </div>
                ))}
              </Popup>
            </Marker>
          )
        }
        return null
      })}
    </MapContainer>
  )
}
