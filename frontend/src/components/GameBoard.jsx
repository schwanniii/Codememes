import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'

const SERVER = import.meta.env.VITE_SOCKET_URL || window.location.origin

export default function GameBoard({ roomData: initialRoomData }) {
  const [roomData, setRoomData] = useState(initialRoomData || null)
  const [loading, setLoading] = useState(!initialRoomData)
  const [spymasterAssignments, setSpymasterAssignments] = useState(null)
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io(SERVER)
    socketRef.current = socket

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
      setRoomData(rd)
      localStorage.setItem('currentGameRoom', JSON.stringify(rd))
    })

    socket.on('spymasterAssignments', ({ assignments }) => {
      setSpymasterAssignments(assignments)
    })

    socket.on('systemMessage', (m) => {
      console.log('System:', m.text)
    })

    return () => {
      socket.disconnect()
    }
  }, [initialRoomData])

  if (loading || !roomData) {
    return <div style={{ padding: 16, textAlign: 'center' }}>Loading game...</div>
  }

  const gameState = roomData.gameState || { currentTeam: 'blue', turn: 'spymaster', words: [] }
  const currentTeam = gameState.currentTeam // 'blue' or 'red'
  const currentTurn = gameState.turn // 'spymaster' or 'guesser'

  const redPlayers = (roomData.players || []).filter((p) => p.team === 'red')
  const bluePlayers = (roomData.players || []).filter((p) => p.team === 'blue')

  const redSpymasters = redPlayers.filter((p) => p.role === 'spymaster')
  const redGuessers = redPlayers.filter((p) => p.role === 'guesser')
  const blueSpymasters = bluePlayers.filter((p) => p.role === 'spymaster')
  const blueGuessers = bluePlayers.filter((p) => p.role === 'guesser')

  const currentTeamLabel = currentTeam === 'blue' ? 'Blau' : 'Rot'
  const hintText =
    currentTurn === 'spymaster'
      ? `${currentTeamLabel} Geheimdienstchef: Gib deinen Ermittlern einen Hinweis`
      : `${currentTeamLabel} Ermittler: Ratet basierend auf dem Hinweis`

  // helper to leave
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {/* TOP ROW: 3 equal boxes (Blue Info | Spacer | Red Info) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: 6, height: 'auto', minHeight: '72px', maxHeight: '120px' }}>
        {/* BLUE TEAM INFO */}
        <div style={{ background: '#e3f2fd', border: '2px solid #1565c0', borderRadius: 6, padding: 10, overflow: 'auto', fontSize: '13px' }}>
          {/* Spymasters */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#1565c0' }}>Geheimdienstchefs</div>
            <div style={{ background: 'white', border: '1px solid #1565c0', borderRadius: 4, padding: 6, minHeight: '28px' }}>
              {blueSpymasters.length === 0 ? (
                <div style={{ fontSize: '10px', color: '#999' }}>-</div>
              ) : (
                blueSpymasters.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '3px 4px',
                      marginBottom: '2px',
                      background: '#1565c0',
                      color: 'white',
                      borderRadius: 2,
                      fontSize: '10px',
                      textAlign: 'center'
                    }}
                  >
                    {p.username}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Guessers */}
          <div>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#1565c0' }}>Ermittler</div>
            <div style={{ background: 'white', border: '1px solid #1565c0', borderRadius: 4, padding: 6, minHeight: '28px' }}>
              {blueGuessers.length === 0 ? (
                <div style={{ fontSize: '10px', color: '#999' }}>-</div>
              ) : (
                blueGuessers.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '3px 4px',
                      marginBottom: '2px',
                      background: '#90caf9',
                      color: '#0d47a1',
                      borderRadius: 2,
                      fontSize: '10px',
                      textAlign: 'center'
                    }}
                  >
                    {p.username}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* CENTER SPACER */}
        <div style={{ background: '#fff', border: '2px solid #ccc', borderRadius: 6, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#999', fontSize: '12px' }}>Codenames</div>
        </div>

        {/* RED TEAM INFO */}
        <div style={{ background: '#ffebee', border: '2px solid #c62828', borderRadius: 6, padding: 10, overflow: 'auto', fontSize: '13px' }}>
          {/* Spymasters */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#c62828' }}>Geheimdienstchefs</div>
            <div style={{ background: 'white', border: '1px solid #c62828', borderRadius: 4, padding: 6, minHeight: '28px' }}>
              {redSpymasters.length === 0 ? (
                <div style={{ fontSize: '10px', color: '#999' }}>-</div>
              ) : (
                redSpymasters.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '3px 4px',
                      marginBottom: '2px',
                      background: '#c62828',
                      color: 'white',
                      borderRadius: 2,
                      fontSize: '10px',
                      textAlign: 'center'
                    }}
                  >
                    {p.username}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Guessers */}
          <div>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#c62828' }}>Ermittler</div>
            <div style={{ background: 'white', border: '1px solid #c62828', borderRadius: 4, padding: 6, minHeight: '28px' }}>
              {redGuessers.length === 0 ? (
                <div style={{ fontSize: '10px', color: '#999' }}>-</div>
              ) : (
                redGuessers.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '3px 4px',
                      marginBottom: '2px',
                      background: '#ef9a9a',
                      color: '#b71c1c',
                      borderRadius: 2,
                      fontSize: '10px',
                      textAlign: 'center'
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '6px 10px' }}>
        <div style={{ textAlign: 'left', fontWeight: 700, color: '#226' }}>Blue: {gameState.remaining?.blue ?? 0}</div>
        <div style={{ textAlign: 'center' }}>
          <select onChange={(e) => { if (e.target.value === 'leave') handleMenuLeave(); }}>
            <option>Menu</option>
            <option value="leave">Leave to Lobby</option>
          </select>
        </div>
        <div style={{ textAlign: 'right', fontWeight: 700, color: '#a22' }}>Red: {gameState.remaining?.red ?? 0}</div>
      </div>

      {/* HINT BOX */}
      <div
        style={{
          padding: 8,
          background: currentTeam === 'blue' ? '#e3f2fd' : '#ffebee',
          borderBottom: `3px solid ${currentTeam === 'blue' ? '#1565c0' : '#c62828'}`,
          textAlign: 'center',
          color: currentTeam === 'blue' ? '#0d47a1' : '#b71c1c',
          fontWeight: 600,
          fontSize: '12px',
          margin: '3px',
          lineHeight: '1.3'
        }}
      >
        {hintText}
      </div>

      {/* GAME BOARD: 25 WORDS (5x5 SQUARE) */}
      <div style={{ flex: 1, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 4,
            width: '100%',
            height: '100%',
            aspectRatio: '1',
            maxWidth: '100vw'
          }}
        >
          {(gameState.words || []).map((w, i) => {
            const revealed = gameState.revealed?.[i]
            const assignment = spymasterAssignments ? spymasterAssignments[i] : null
            const isSpymaster = (roomData.players || []).find((p) => p.id === socketRef.current.id)?.role === 'spymaster'
            const bg = revealed ? (gameState.assignments?.[i] === 'blue' ? '#aee' : gameState.assignments?.[i] === 'red' ? '#fdd' : gameState.assignments?.[i] === 'black' ? '#000' : '#efe6d6') : '#fff'

            return (
              <div
                key={i}
                onClick={() => {
                  if (!revealed) {
                    socketRef.current.emit('revealWord', { code: roomData.code, index: i }, (res) => {
                      // noop
                    })
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: revealed ? bg : '#fff',
                  border: '2px solid #333',
                  borderRadius: 3,
                  padding: 6,
                  height: 72,
                  cursor: revealed ? 'default' : 'pointer',
                  fontWeight: 600,
                  fontSize: 'clamp(10px, 2.2vw, 14px)',
                  textAlign: 'center',
                  opacity: revealed ? 0.6 : 1,
                  transition: 'all 0.15s',
                  userSelect: 'none',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  lineHeight: '1.2',
                  position: 'relative'
                }}
              >
                <div>{w}</div>
                {isSpymaster && !revealed && assignment && (
                  <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 11, padding: '2px 6px', background: 'rgba(0,0,0,0.06)', borderRadius: 4 }}>
                    {assignment}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* BOTTOM AREA - PLACEHOLDER FOR FUTURE FEATURES */}
      <div style={{ minHeight: '80px', background: '#fff', borderTop: '1px solid #ddd', padding: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#226', fontWeight: 700 }}>Blue remaining: {gameState.remaining?.blue ?? 0}</div>
          <div>
            <select onChange={(e) => { if (e.target.value === 'leave') handleMenuLeave(); }}>
              <option>Menu</option>
              <option value="leave">Leave to Lobby</option>
            </select>
          </div>
          <div style={{ color: '#a22', fontWeight: 700 }}>Red remaining: {gameState.remaining?.red ?? 0}</div>
        </div>
      </div>
    </div>
  )
}
