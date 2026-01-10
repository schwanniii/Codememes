import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SOCKET_URL || window.location.origin

export default function GameBoard({ roomData: initialRoomData }) {
  const [roomData, setRoomData] = useState(initialRoomData || null)
  const [loading, setLoading] = useState(!initialRoomData)
  const [spymasterAssignments, setSpymasterAssignments] = useState(null)
  const [socketId, setSocketId] = useState(null)
  const [hintInput, setHintInput] = useState('')
  const [numberInput, setNumberInput] = useState('1')
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io(SERVER)
    socketRef.current = socket

    socket.on('connect', () => {
      setSocketId(socket.id)
      console.log('Socket connected:', socket.id)
    })

    // Try to rejoin using saved room code and username
    const savedCode = (initialRoomData && initialRoomData.code) || localStorage.getItem('currentRoomCode')
    const savedUsername = localStorage.getItem('username')
    if (savedCode && savedUsername) {
      socket.emit('joinRoomByCode', { code: savedCode, username: savedUsername }, ({ success, code, roomData: rd, error }) => {
        if (success) {
          setRoomData(rd)
          setLoading(false)
        } else {
          console.warn('Failed to rejoin room:', error)
          setLoading(false)
        }
      })
    } else if (initialRoomData) {
      setLoading(false)
    }

    socket.on('roomUpdated', (rd) => {
      console.log('Room updated:', rd)
      setRoomData(rd)
      localStorage.setItem('currentGameRoom', JSON.stringify(rd))
    })

    socket.on('spymasterAssignments', ({ assignments }) => {
      console.log('Spymaster assignments received')
      setSpymasterAssignments(assignments)
    })

    socket.on('systemMessage', (m) => {
      console.log('System:', m.text)
    })

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err)
    })

    return () => {
      socket.disconnect()
    }
  }, [initialRoomData])

  if (loading || !roomData) {
    return (
      <div style={{ padding: 16, textAlign: 'center', background: '#f5f5f5', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Loading game...</div>
          <div style={{ fontSize: 14, color: '#666' }}>Verbinde zum Spiel...</div>
        </div>
      </div>
    )
  }

  const gameState = roomData.gameState || { currentTeam: 'blue', turn: 'spymaster', words: [] }
  const currentTeam = gameState.currentTeam
  const currentTurn = gameState.turn
  const isMyTeam = socketId && (roomData.players || []).find((p) => p.id === socketId)?.team === currentTeam
  const isMyRole = socketId && (roomData.players || []).find((p) => p.id === socketId)?.role === currentTurn
  const isSpymaster = socketId && (roomData.players || []).find((p) => p.id === socketId)?.role === 'spymaster'
  const isGuesser = socketId && (roomData.players || []).find((p) => p.id === socketId)?.role === 'guesser'

  const redPlayers = (roomData.players || []).filter((p) => p.team === 'red')
  const bluePlayers = (roomData.players || []).filter((p) => p.team === 'blue')

  const redSpymasters = redPlayers.filter((p) => p.role === 'spymaster')
  const redGuessers = redPlayers.filter((p) => p.role === 'guesser')
  const blueSpymasters = bluePlayers.filter((p) => p.role === 'spymaster')
  const blueGuessers = bluePlayers.filter((p) => p.role === 'guesser')

  const currentTeamLabel = currentTeam === 'blue' ? 'Blau' : 'Rot'

  const handleGiveHint = () => {
    if (!hintInput || !numberInput) {
      alert('Bitte Hinweis und Zahl eingeben')
      return
    }
    socketRef.current.emit(
      'giveHint',
      { code: roomData.code, word: hintInput, number: parseInt(numberInput) },
      ({ success, error }) => {
        if (success) {
          setHintInput('')
          setNumberInput('1')
        } else {
          alert('Hinweis fehlgeschlagen: ' + error)
        }
      }
    )
  }

  const handleGuessWord = (index) => {
    socketRef.current.emit('guessWord', { code: roomData.code, index }, ({ success, error }) => {
      if (!success) {
        console.error('Guess failed:', error)
      }
    })
  }

  const handleMenuLeave = () => {
    if (!roomData || !roomData.code) return
    const sock = socketRef.current
    if (sock) {
      sock.emit('leaveRoomByCode', { code: roomData.code })
    }
    localStorage.removeItem('currentRoomCode')
    localStorage.removeItem('currentGameRoom')
    window.location.reload()
  }

  // Check for game over
  const isGameOver = roomData.gameState?.winner !== null && roomData.gameState?.winner !== undefined
  const winnerLabel = gameState.winner === 'blue' ? 'Blau' : gameState.winner === 'red' ? 'Rot' : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {/* TOP ROW: Team displays */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 4, background: '#fafafa', borderBottom: '2px solid #ddd', maxHeight: '140px', overflow: 'hidden' }}>
        {/* BLUE TEAM */}
        <div style={{ background: '#e3f2fd', border: '3px solid #1565c0', borderRadius: 6, padding: 8, overflow: 'auto', fontSize: '12px' }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#0d47a1', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 16, height: 16, background: '#1565c0', borderRadius: '50%' }}></span>
            Blau
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#1565c0', marginBottom: 4, textTransform: 'uppercase' }}>🔐 Geheimdienstchefs ({blueSpymasters.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {blueSpymasters.length === 0 ? (
                <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>Niemand</div>
              ) : (
                blueSpymasters.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '6px 10px',
                      background: '#1565c0',
                      color: 'white',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(21, 101, 192, 0.3)'
                    }}
                  >
                    {p.username}
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#1565c0', marginBottom: 4, textTransform: 'uppercase' }}>👥 Ermittler ({blueGuessers.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {blueGuessers.length === 0 ? (
                <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>Niemand</div>
              ) : (
                blueGuessers.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '6px 10px',
                      background: '#90caf9',
                      color: '#0d47a1',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(144, 202, 249, 0.4)'
                    }}
                  >
                    {p.username}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RED TEAM */}
        <div style={{ background: '#ffebee', border: '3px solid #c62828', borderRadius: 8, padding: 12, overflow: 'auto' }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#b71c1c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 16, height: 16, background: '#c62828', borderRadius: '50%' }}></span>
            Rot Team
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#c62828', marginBottom: 4, textTransform: 'uppercase' }}>🔐 Geheimdienstchefs ({redSpymasters.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {redSpymasters.length === 0 ? (
                <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>Niemand</div>
              ) : (
                redSpymasters.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '6px 10px',
                      background: '#c62828',
                      color: 'white',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(198, 40, 40, 0.3)'
                    }}
                  >
                    {p.username}
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#c62828', marginBottom: 4, textTransform: 'uppercase' }}>👥 Ermittler ({redGuessers.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {redGuessers.length === 0 ? (
                <div style={{ fontSize: 11, color: '#999', fontStyle: 'italic' }}>Niemand</div>
              ) : (
                redGuessers.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '6px 10px',
                      background: '#ef9a9a',
                      color: '#b71c1c',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 4px rgba(239, 154, 154, 0.4)'
                    }}
                  >
                    {p.username}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SMALL TOP COUNTERS / MENU */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: 6, background: '#fff', borderBottom: '2px solid #ddd' }}>
        <div style={{ textAlign: 'left', fontWeight: 700, fontSize: 12, color: '#226' }}>🔵 {gameState.remaining?.blue ?? 0}</div>
        <div style={{ textAlign: 'center' }}>
          <select onChange={(e) => { if (e.target.value === 'leave') handleMenuLeave(); }} style={{ padding: '4px 8px', fontSize: 11 }}>
            <option>Menu</option>
            <option value="leave">Leave</option>
          </select>
        </div>
        <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, color: '#a22' }}>{gameState.remaining?.red ?? 0} 🔴</div>
      </div>

      {/* HINT BOX */}
      {isGameOver ? (
        <div style={{ padding: 8, background: '#fff9c4', textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#333' }}>
          🎉 Team {winnerLabel} gewinnt! 🎉
        </div>
      ) : currentTurn === 'spymaster' && isMyRole && isMyTeam ? (
        <div style={{ padding: 8, background: '#e8f5e9', borderBottom: '2px solid #4caf50', display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
          <input
            type="text"
            placeholder="Hinweis..."
            value={hintInput}
            onChange={(e) => setHintInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleGiveHint()}
            style={{ flex: 1, padding: 5, borderRadius: 3, border: '1px solid #ccc', fontSize: 11 }}
          />
          <input
            type="number"
            min="1"
            max="25"
            value={numberInput}
            onChange={(e) => setNumberInput(e.target.value)}
            style={{ width: 45, padding: 5, borderRadius: 3, border: '1px solid #ccc', fontSize: 11 }}
          />
          <button onClick={handleGiveHint} style={{ padding: '5px 10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
            Senden
          </button>
        </div>
      ) : (
        <div style={{ padding: 6, background: currentTeam === 'blue' ? '#e3f2fd' : '#ffebee', borderBottom: `3px solid ${currentTeam === 'blue' ? '#1565c0' : '#c62828'}`, textAlign: 'center', color: currentTeam === 'blue' ? '#0d47a1' : '#b71c1c', fontWeight: 600, fontSize: 11, lineHeight: '1.3' }}>
          {gameState.hint ? `Hinweis: "${gameState.hint.word}: ${gameState.hint.number}" (${gameState.guessesRemaining} Rateversuche)` : 'Warte auf Hinweis...'}
        </div>
      )}

      {/* GAME BOARD: 25 WORDS (5x5 SQUARE) - Mobile Optimized */}
      <div style={{ flex: 1, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0, paddingBottom: 80 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 3,
            width: '100%',
            height: '100%',
            aspectRatio: '1',
            maxWidth: '100vw'
          }}
        >
          {(gameState.words || []).map((w, i) => {
            const revealed = gameState.revealed?.[i]
            const assignment = spymasterAssignments ? spymasterAssignments[i] : null
            // Determine tile background
            let bg = '#fff'
            let borderColor = '#333'
            let borderWidth = 2
            if (revealed && assignment) {
              if (assignment === 'blue') bg = '#aee'
              else if (assignment === 'red') bg = '#fdd'
              else if (assignment === 'black') bg = '#000'
              else bg = '#efe6d6'
            }
            // For spymaster: show colored left border for unrevealed cards
            if (isSpymaster && !revealed && assignment) {
              if (assignment === 'blue') borderColor = '#1565c0'
              else if (assignment === 'red') borderColor = '#c62828'
              else if (assignment === 'black') borderColor = '#000'
              else borderColor = '#999'
              borderWidth = 5
            }

            return (
              <div
                key={i}
                onClick={() => {
                  if (!revealed && currentTurn === 'guesser' && isMyRole && !isGameOver) {
                    handleGuessWord(i)
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: revealed ? bg : '#fff',
                  border: `${borderWidth}px solid ${borderColor}`,
                  borderRadius: 2,
                  padding: 2,
                  cursor: revealed || !isMyRole || isGameOver ? 'default' : 'pointer',
                  fontWeight: 600,
                  fontSize: 'clamp(9px, 1.8vw, 12px)',
                  textAlign: 'center',
                  opacity: revealed ? 0.5 : 1,
                  transition: 'all 0.15s',
                  userSelect: 'none',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  lineHeight: '1.2',
                  position: 'relative',
                  aspectRatio: '1'
                }}
              >
                <div style={{ padding: '2px' }}>{w}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* BOTTOM SPACER - Fixed space for phone scrolling */}
      <div style={{ minHeight: 0, background: '#fff', borderTop: '1px solid #ddd' }}>
        {/* Mobile spacer */}
      </div>
    </div>
  )
}
