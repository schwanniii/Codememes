import React, { useEffect, useState } from 'react'
import VideoGrid from './components/VideoGrid'
import RealtimeDemo from './components/RealtimeDemo'
import DiagnosticPanel from './components/DiagnosticPanel'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'

export default function App() {
  const [videos, setVideos] = useState([])
  const [gameStarted, setGameStarted] = useState(null)

  useEffect(() => {
    fetch('/api/videos')
      .then((res) => res.json())
      .then((data) => setVideos(data))
      .catch((err) => console.error('Video fetch error', err))
  }, [])

  // Restore game session from localStorage on mount
  useEffect(() => {
    const savedGameRoom = localStorage.getItem('currentGameRoom')
    if (savedGameRoom) {
      try {
        const roomData = JSON.parse(savedGameRoom)
        console.log('Restoring game session:', roomData.code)
        setGameStarted(roomData)
      } catch (err) {
        console.error('Failed to restore game session:', err)
        localStorage.removeItem('currentGameRoom')
      }
    }
  }, [])

  function handleGameStart(roomData) {
    console.log('Game started, saving to localStorage:', roomData.code)
    localStorage.setItem('currentGameRoom', JSON.stringify(roomData))
    setGameStarted(roomData)
  }

  if (gameStarted) {
    return <GameBoard roomData={gameStarted} />
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
