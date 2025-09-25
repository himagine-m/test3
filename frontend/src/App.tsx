import { MapContainer, ImageOverlay, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'


// SVGサイズに合わせて座標系を定義
const width = 1000
const height = 800
const bounds: L.LatLngBoundsExpression = [[0, 0], [height, width]]



export default function App() {
  return (
    <MapContainer
      crs={L.CRS.Simple} // ピクセルベースのローカル座標系
      bounds={bounds}
      maxZoom={3}
      minZoom={-1}
      zoom={0}
      style={{ height: '100vh', width: '100vw' }}
    >
      {/* SVGを画像として読み込む */}
      <ImageOverlay url="/CTS2.svg" bounds={bounds} />

      {/* 位置指定は [y, x] で注意 */}
      <Marker position={[400, 500]}>
        <Popup>ここに何かある！</Popup>
      </Marker>
    </MapContainer>
  )
}

// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App
