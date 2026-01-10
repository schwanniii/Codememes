import React, { useEffect, useState } from 'react'
import VideoGrid from './components/VideoGrid'
import RealtimeDemo from './components/RealtimeDemo'
import DiagnosticPanel from './components/DiagnosticPanel'
import Lobby from './components/Lobby'

export default function App() {
  const [videos, setVideos] = useState([])
  const [gameStarted, setGameStarted] = useState(null)

  useEffect(() => {
    fetch('/api/videos')
      .then((res) => res.json())
      .then((data) => setVideos(data))
      .catch((err) => console.error('Video fetch error', err))
  }, [])

  function handleGameStart(roomData) {
    setGameStarted(roomData)
  }

  if (gameStarted) {
    return (
      <div style={{ maxWidth: 1000, margin: '24px auto', fontFamily: 'sans-serif' }}>
        <h1>🎮 Game in Progress</h1>
        <p>Room Code: <strong>{gameStarted.code}</strong></p>
        <div style={{ padding: 16, background: '#fff3cd', borderRadius: 8, marginBottom: 16 }}>
          <strong>Game Engine coming soon!</strong> This is where the Codenames game will be played.
        </div>
        <button
          onClick={() => setGameStarted(null)}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Back to Lobby
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1000, margin: '24px auto', fontFamily: 'sans-serif' }}>
      <h1>Codenames — Video Edition</h1>
      <p>Create a room or join with a code. The host can start the game.</p>
      
      <Lobby onGameStart={handleGameStart} />
      
      <details style={{ marginTop: 24, padding: 12, background: '#f0f0f0', borderRadius: 4 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>🔧 Debug & Test</summary>
        <div style={{ marginTop: 12 }}>
          <DiagnosticPanel />
          <RealtimeDemo />
          <VideoGrid videos={videos} />
        </div>
      </details>
    </div>
  )
}
