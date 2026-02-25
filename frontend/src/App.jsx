import React, { useEffect, useState } from 'react'
import VideoGrid from './components/VideoGrid'
import RealtimeDemo from './components/RealtimeDemo'
import DiagnosticPanel from './components/DiagnosticPanel'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'

console.log('DEBG-Alle Vite-Env-Variablen:', import.meta.env);
console.log('Key:', import.meta.env.VITE_GIPHY_API_KEY); // Sollte den Wert aus .env anzeigen

export default function App() {
  const [videos, setVideos] = useState([])
  const [gameStarted, setGameStarted] = useState(null)

  useEffect(() => {
    // fetch('/api/videos')
    // .then((res) => res.json())
    //   .then((data) => setVideos(data))
    //   .catch((err) => console.error('Video fetch error', err))
  }, [])

  // Restore game session from localStorage on mount
 useEffect(() => {
    const savedGameRoom = localStorage.getItem('currentGameRoom');
    const savedRoomCode = localStorage.getItem('currentRoomCode');
    
    // Nur wiederherstellen, wenn beides da ist
    if (savedGameRoom && savedRoomCode) {
      try {
        const roomData = JSON.parse(savedGameRoom);
        // WICHTIG: Wir setzen das nur als Initialwert. 
        // Die Lobby/GameBoard wird via Socket die echten, frischen Daten ziehen.
        setGameStarted(roomData);
      } catch (err) {
        console.error('Failed to restore game session:', err);
      }
    }
  }, []);

  function handleGameStart(roomData) {
    console.log('Game started, saving to localStorage:', roomData.code)
    localStorage.setItem('currentGameRoom', JSON.stringify(roomData))
    setGameStarted(roomData)
  }

  function handleResetToLobby() {
    console.log('Returning to lobby, clearing saved game');
    localStorage.removeItem('currentGameRoom');
    setGameStarted(null);
  }

  if (gameStarted) {
    return <GameBoard roomData={gameStarted} onReset={handleResetToLobby} />
  }

  return (
    <div style={{ maxWidth: 1000, margin: '24px auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, transform: 'translateX(2%)' }}>Codememes</h1>
      
      <Lobby onGameStart={handleGameStart} />
    </div>
  )
}
