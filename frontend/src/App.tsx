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
//========= 画像を import（ViteでURLに解決） =========
import apPng from './assets/pict/APblue.png'
import pcPng from './assets/pict/PCgray.png'
import printerPng from './assets/pict/PRNgray.png'
import l2switchPng from './assets/pict/L2blue.png'
import hubPng from './assets/pict/HUBgrn.png'
import outletPng from './assets/pict/INFgray.png'
import defaultPng from './assets/pict/APblue.png'

// ========= アイコン生成（48px、中心アンカー） =========
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

//PATCHリクエスト関数patchDeviceを定義
async function patchDevice(id: string, data: Partial<DeviceProps>) {
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined && v !== '')
    ) as Partial<DeviceProps>

   const payload = { properties: filtered }
    // （送信前のJSONを確認）
    console.log('📦 PATCH送信データ:', JSON.stringify(filtered, null, 2))

    const response = await fetch(`http://127.0.0.1:8000/api/floors/1F/devices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const text = await response.text()
    throw new Error(`PATCH失敗: ${response.status} - ${text}`)
  }

  return response.json()
}

// 1Fデバイス取得
export default function App() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)//編集中のマーカー
  const [editedProps, setEditedProps] = useState<Partial<DeviceProps>>({})//編集内容
  const [loading, setLoading] = useState(false)//patch状態管理
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

//編集フォームで入力を受け取る関数を追加
  const handleChange = (key: string, value: string) => {
    setEditedProps(prev => ({ ...prev, [key]: value }))
  }  
  //保存処理の関数
  const handleSave = async (idx: number) => {
  const feature = features[idx]
  const props = feature.properties as DeviceProps
  const id = props?.id

  if (!id) {
    alert('このデバイスにはIDがありません。PATCHできません。')
    return
  }

  setLoading(true)

 try {
    await patchDevice(id, editedProps)

    // ✅ 保存後に再取得してリフレッシュ
    const res = await fetch('http://127.0.0.1:8000/api/floors/1F/devices')
    const geojson = await res.json()
    if (geojson && geojson.features) {
      setFeatures(geojson.features)
    }

    setEditingIndex(null)
    setEditedProps({})
    alert('✅ 更新成功')
    } catch (err) {
      console.error(err)
      alert('⚠️ 更新に失敗しました')
    } finally {
    setLoading(false)
  }
}
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
                  {editingIndex === idx ? (
                    <div style={{ minWidth: 180 }}>
                      {Object.entries(props ?? {}).map(([key, value]) => (
                        <div key={key} style={{ marginBottom: 4 }}>
                          <label>
                            <strong>{key}:</strong>{' '}
                            <input
                              type="text"
                              value={editedProps[key] ?? String(value)}
                              onChange={e => handleChange(key, e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </label>
                        </div>
                      ))}
                      <button onClick={() => handleSave(idx)} disabled={loading}>
                        {loading ? '更新中...' : '💾 保存'}
                      </button>{' '}
                      <button onClick={() => setEditingIndex(null)}>キャンセル</button>
                    </div>
                  ) : (
                    <div>
                      {Object.entries(props ?? {}).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setEditingIndex(idx)
                          setEditedProps(props)
                        }}
                      >
                        ✏️ 編集
                      </button>
                    </div>
                  )}
                </Popup>
            </Marker>
          )
        }
        return null
      })}
    </MapContainer>
  )
}
