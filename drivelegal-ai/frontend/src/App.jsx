import { useEffect } from 'react'
import './game/Game.js'

function App() {
  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      padding:        '20px',
      color:          '#ffffff'
    }}>
      <h2 style={{ marginBottom: '12px', fontFamily: 'monospace' }}>
        DriveLegal AI — Phase 5
      </h2>
      <div id="game-container" />
      <p style={{ marginTop: '12px', opacity: 0.5, fontSize: '13px' }}>
        Arrow keys · SHIFT boost · Stop at red
      </p>
    </div>
  )
}

export default App