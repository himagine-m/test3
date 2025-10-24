import { useEffect, useState } from 'react'
import { MapContainer, ImageOverlay, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type{ Feature } from 'geojson'

//型定義
type DeviceType = 'PC' | 'Printer' | 'L2Switch' | 'HUB' | 'Outlet' | 'Access_point' |string
type DeviceProps = {
  id: string
  type: DeviceType
  category?: string
  name: string
  user?: string
  ip?: string
  vlan?: string
  model?: string
  os?: string
  floor?: string | number
  assetTag?: string
  maintenance?: boolean
  connectedTo?: string
  uplinkTo?: string
  note?: string
  updated?: string
 // [k: string]: unknown
}
//========= 追加: 画像を import（ViteでURLに解決） =========
import apPng from './assets/pict/APblue.png'
import pcPng from './assets/pict/PCgray.png'
import printerPng from './assets/pict/PRNgray.png'
import l2switchPng from './assets/pict/L2blue.png'
import hubPng from './assets/pict/HUBgrn.png'
import outletPng from './assets/pict/INFgray.png'
import defaultPng from './assets/pict/APblue.png'

// ========= 追加: アイコン生成（48px、中心アンカー） =========
const ICON_SIZE: [number, number] = [48, 48]
const ICON_ANCHOR: [number, number] = [24, 24]
const POPUP_ANCHOR: [number, number] = [0, -24]

const makeIcon = (url: string) =>
  L.icon({
    iconUrl: url,
    iconSize: ICON_SIZE,
    iconAnchor: ICON_ANCHOR,
    popupAnchor: POPUP_ANCHOR,
    className: 'device-icon', // CSS調整したい場合に使う
  })

// 予め1回だけ生成（再レンダでの無駄を減らす）
const ICONS: Record<string, L.Icon> = {
  PC: makeIcon(pcPng),
  Printer: makeIcon(printerPng),
  L2Switch: makeIcon(l2switchPng),
  HUB: makeIcon(hubPng),
  Outlet: makeIcon(outletPng),
  Access_point: makeIcon(apPng),
}
const DEFAULT_ICON = makeIcon(defaultPng)

// SVGサイズに合わせて座標系を定義
const width = 2267.889
const height = 2892.29
const bounds: L.LatLngBoundsExpression = [[0, 0], [height, width]]

// 1Fデバイス取得
export default function App() {
  const [features, setFeatures] = useState<Feature[]>([])

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/floors/1F/devices')
      .then(res => res.json())
      .then(geojson => {
        // console.log('取得したGeoJSON:', geojson)
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

      {/* サンプルマーカー
      <Marker position={[800, 700]}>
        <Popup>ここに何かある！</Popup>
      </Marker> */}

      {/* GeoJSONの各Featureをマーカーで表示 */}
      {features.map((feature, idx) => {
        // Pointのみ対応
        if (feature.geometry.type === 'Point') {
          const [x, y] = feature.geometry.coordinates
          // プロパティからデバイスタイプを取得（なければ空文字）
          const props = feature.properties as DeviceProps
          const type = props?.type ?? ''
          // 対応するアイコンを取得（存在しないタイプはデフォルトアイコンに）
          const icon = ICONS[type] ?? DEFAULT_ICON

          return (
            <Marker key={idx} position={[y, x]} icon={icon}>
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
