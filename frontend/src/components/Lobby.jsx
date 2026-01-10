import React, { useState, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SOCKET_URL || window.location.origin

const roleLabels = {
  spymaster: 'Geheimdienstchef',
  guesser: 'Ermittler'
}

const teamColors = {
  red: { bg: '#ffebee', border: '#c62828', text: '#b71c1c' },
  blue: { bg: '#e3f2fd', border: '#1565c0', text: '#0d47a1' }
}

export default function Lobby({ onGameStart }) {
  const socketRef = useRef(null)
  const [username, setUsername] = useState('')
  const [currentRoom, setCurrentRoom] = useState(null) // { code, roomData }
  const [joinCode, setJoinCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [myRole, setMyRole] = useState({ team: null, role: null })

  useEffect(() => {
    const socket = io(SERVER)
    socketRef.current = socket

    // Restore session from localStorage
    const savedRoom = localStorage.getItem('currentRoomCode')
    const savedUsername = localStorage.getItem('username')
    
    if (savedRoom && savedUsername) {
      console.log('Restoring session:', savedRoom)
      setUsername(savedUsername)
      socketRef.current.emit('joinRoomByCode', { code: savedRoom, username: savedUsername }, ({ success, code, roomData, error }) => {
        if (success) {
          setCurrentRoom({ code, roomData })
        } else {
          console.warn('Failed to restore session:', error)
          localStorage.removeItem('currentRoomCode')
          localStorage.removeItem('username')
        }
      })
    }

    socket.on('roomUpdated', (roomData) => {
      console.log('Room updated:', roomData)
      
      // Update my current role from roomData
      const myPlayer = roomData.players.find((p) => p.id === socket.id)
      if (myPlayer) {
        setMyRole({ team: myPlayer.team, role: myPlayer.role })
      }
      
      setCurrentRoom((prev) => prev ? { code: prev.code, roomData } : null)
    })

    socket.on('gameStarted', (roomData) => {
      console.log('Game started!')
      onGameStart(roomData)
    })

    socket.on('systemMessage', (msg) => {
      console.log('System message:', msg.text)
    })

    return () => {
      socket.disconnect()
    }
  }, [onGameStart])

  function handleCreateRoom() {
    if (!username) {
      setErrorMessage('Please enter a username')
      return
    }

    socketRef.current.emit('createRoom', { username }, ({ success, code, roomData }) => {
      if (success) {
        setErrorMessage('')
        localStorage.setItem('currentRoomCode', code)
        localStorage.setItem('username', username)
        setCurrentRoom({ code, roomData })
      } else {
        setErrorMessage('Failed to create room')
      }
    })
  }

  function handleJoinRoom() {
    if (!username) {
      setErrorMessage('Please enter a username')
      return
    }

    if (!joinCode || joinCode.length !== 6) {
      setErrorMessage('Invalid code (must be 6 characters)')
      return
    }

    socketRef.current.emit('joinRoomByCode', { code: joinCode, username }, ({ success, code, roomData, error }) => {
      if (success) {
        setErrorMessage('')
        localStorage.setItem('currentRoomCode', code)
        localStorage.setItem('username', username)
        setCurrentRoom({ code, roomData })
        setJoinCode('')
      } else {
        setErrorMessage(`Failed to join: ${error}`)
      }
    })
  }

  function handleLeaveRoom() {
    if (currentRoom) {
      socketRef.current.emit('leaveRoomByCode', { code: currentRoom.code })
      localStorage.removeItem('currentRoomCode')
      localStorage.removeItem('username')
      setCurrentRoom(null)
      setErrorMessage('')
      setMyRole({ team: null, role: null })
    }
  }

  function handleSelectRole(team, role) {
    if (currentRoom) {
      socketRef.current.emit('updatePlayerRole', { code: currentRoom.code, team, role }, ({ success, error }) => {
        if (!success) {
          setErrorMessage(`Cannot change role: ${error}`)
        }
      })
    }
  }

  function handleStartGame() {
    if (currentRoom) {
      socketRef.current.emit('startGame', { code: currentRoom.code }, ({ success, error }) => {
        if (!success) {
          setErrorMessage(`Cannot start: ${error}`)
        }
      })
    }
  }

  if (currentRoom) {
    const { code, roomData } = currentRoom
    const isHost = roomData.host === socketRef.current.id
    const playerCount = roomData.players.length

    return (
      <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
        <h2>Raum: {code}</h2>

        {errorMessage && <div style={{ color: 'red', marginBottom: 8, fontWeight: 600 }}>{errorMessage}</div>}

        {/* Spieler-Liste */}
        <div style={{ marginBottom: 16 }}>
          <strong>Players ({playerCount}):</strong>
          <ul style={{ margin: '8px 0', paddingLeft: 20, listStyle: 'none' }}>
            {roomData.players.map((p) => {
              const color = p.team ? teamColors[p.team] : { bg: '#f0f0f0', text: '#666' }
              return (
                <li key={p.id} style={{ padding: '6px 8px', marginBottom: 4, background: color.bg, borderLeft: `4px solid ${color.border || '#ccc'}`, borderRadius: 2 }}>
                  <span style={{ fontWeight: 600 }}>{p.username}</span>
                  {p.isHost && <span style={{ marginLeft: 8 }}>👑</span>}
                  {p.team && p.role && (
                    <span style={{ marginLeft: 8, fontSize: 12 }}>
                      ({p.team.toUpperCase()} • {roleLabels[p.role]})
                    </span>
                  )}
                  {!p.team && <span style={{ marginLeft: 8, fontSize: 12, color: '#999' }}>Noch keine Rolle gewählt</span>}
                </li>
              )
            })}
          </ul>
        </div>

        {/* Team/Rollen-Auswahl */}
        <div style={{ marginBottom: 16 }}>
          <strong style={{ display: 'block', marginBottom: 8 }}>Wähle dein Team & deine Rolle:</strong>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {/* ROT */}
            <div style={{ padding: 12, background: '#fff3e0', border: '2px solid #ff6f00', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, color: '#e65100', marginBottom: 8 }}>🔴 Team Rot</div>
              <button
                onClick={() => handleSelectRole('red', 'spymaster')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 8,
                  marginBottom: 6,
                  background: myRole.team === 'red' && myRole.role === 'spymaster' ? '#ff6f00' : '#fff',
                  color: myRole.team === 'red' && myRole.role === 'spymaster' ? 'white' : '#333',
                  border: myRole.team === 'red' && myRole.role === 'spymaster' ? '2px solid #ff6f00' : '1px solid #ddd',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: myRole.team === 'red' && myRole.role === 'spymaster' ? 600 : 400,
                  transition: 'all 0.2s'
                }}
              >
                🕵️ Geheimdienstchef
              </button>
              <button
                onClick={() => handleSelectRole('red', 'guesser')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 8,
                  background: myRole.team === 'red' && myRole.role === 'guesser' ? '#ff6f00' : '#fff',
                  color: myRole.team === 'red' && myRole.role === 'guesser' ? 'white' : '#333',
                  border: myRole.team === 'red' && myRole.role === 'guesser' ? '2px solid #ff6f00' : '1px solid #ddd',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: myRole.team === 'red' && myRole.role === 'guesser' ? 600 : 400,
                  transition: 'all 0.2s'
                }}
              >
                🔍 Ermittler
              </button>
            </div>

            {/* BLAU */}
            <div style={{ padding: 12, background: '#e8f5e9', border: '2px solid #1976d2', borderRadius: 6 }}>
              <div style={{ fontWeight: 600, color: '#0d47a1', marginBottom: 8 }}>🔵 Team Blau</div>
              <button
                onClick={() => handleSelectRole('blue', 'spymaster')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 8,
                  marginBottom: 6,
                  background: myRole.team === 'blue' && myRole.role === 'spymaster' ? '#1976d2' : '#fff',
                  color: myRole.team === 'blue' && myRole.role === 'spymaster' ? 'white' : '#333',
                  border: myRole.team === 'blue' && myRole.role === 'spymaster' ? '2px solid #1976d2' : '1px solid #ddd',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: myRole.team === 'blue' && myRole.role === 'spymaster' ? 600 : 400,
                  transition: 'all 0.2s'
                }}
              >
                🕵️ Geheimdienstchef
              </button>
              <button
                onClick={() => handleSelectRole('blue', 'guesser')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 8,
                  background: myRole.team === 'blue' && myRole.role === 'guesser' ? '#1976d2' : '#fff',
                  color: myRole.team === 'blue' && myRole.role === 'guesser' ? 'white' : '#333',
                  border: myRole.team === 'blue' && myRole.role === 'guesser' ? '2px solid #1976d2' : '1px solid #ddd',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontWeight: myRole.team === 'blue' && myRole.role === 'guesser' ? 600 : 400,
                  transition: 'all 0.2s'
                }}
              >
                🔍 Ermittler
              </button>
            </div>
          </div>
        </div>

        {/* Kontrollen */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {isHost && (
            <button
              onClick={handleStartGame}
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ▶️ Start Game
            </button>
          )}

          <button
            onClick={handleLeaveRoom}
            style={{
              padding: '8px 16px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer'
            }}
          >
            Leave Room
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
          {isHost ? '🟢 Du bist der Host. Alle Spieler sollten ihre Rollen wählen, bevor du "Start Game" drückst.' : '⏳ Warte bis der Host das Spiel startet...'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
      <h2>📍 Lobby</h2>

      {errorMessage && <div style={{ color: 'red', marginBottom: 8 }}>{errorMessage}</div>}

      <div style={{ marginBottom: 12 }}>
        <label>
          Username:
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ marginLeft: 8, padding: 6, width: 200 }}
            placeholder="Your name"
          />
        </label>
      </div>

      <div style={{ marginBottom: 12, padding: 12, background: 'white', borderRadius: 4 }}>
        <button
          onClick={handleCreateRoom}
          style={{
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Create Room
        </button>
        <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#666' }}>Create a new game room and invite friends with the room code.</p>
      </div>

      <div style={{ padding: 12, background: 'white', borderRadius: 4 }}>
        <div style={{ marginBottom: 8 }}>
          <label>
            Room Code:
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              maxLength={6}
              style={{ marginLeft: 8, padding: 6, width: 120, fontFamily: 'monospace', fontSize: 16 }}
            />
          </label>
        </div>
        <button
          onClick={handleJoinRoom}
          style={{
            padding: '8px 16px',
            background: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Join Room
        </button>
        <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#666' }}>Enter a room code to join an existing game.</p>
      </div>
    </div>
  )
}
