import React, { useState, useRef, useEffect } from 'react'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SOCKET_URL || window.location.origin

export default function Lobby({ onGameStart }) {
  const socketRef = useRef(null)
  const [username, setUsername] = useState('')
  const [currentRoom, setCurrentRoom] = useState(null) // { code, roomData }
  const [joinCode, setJoinCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const socket = io(SERVER)
    socketRef.current = socket

    socket.on('roomUpdated', (roomData) => {
      console.log('Room updated:', roomData)
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
      setCurrentRoom(null)
      setErrorMessage('')
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
        <h2>🎮 Room: {code}</h2>

        <div style={{ marginBottom: 12 }}>
          <strong>Players ({playerCount}):</strong>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            {roomData.players.map((p) => (
              <li key={p.id}>
                {p.username} {p.isHost ? '👑 (Host)' : ''}
              </li>
            ))}
          </ul>
        </div>

        {errorMessage && <div style={{ color: 'red', marginBottom: 8 }}>{errorMessage}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          {isHost && (
            <button
              onClick={handleStartGame}
              style={{
                padding: '8px 16px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              Start Game
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
          {isHost ? '🟢 You are the host. Press "Start Game" when ready.' : '⏳ Waiting for host to start the game...'}
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
