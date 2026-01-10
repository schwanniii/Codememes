import React, { useEffect, useState } from 'react'

export default function GameBoard({ roomData }) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Use words from gameState (shared across all players)
    if (roomData.gameState && roomData.gameState.words) {
      setWords(
        roomData.gameState.words.map((w, i) => ({
          id: i,
          word: w,
          revealed: false
        }))
      )
      setLoading(false)
    }
  }, [roomData])

  const gameState = roomData.gameState || { currentTeam: 'blue', turn: 'spymaster', words: [] }
  const currentTeam = gameState.currentTeam // 'blue' or 'red'
  const currentTurn = gameState.turn // 'spymaster' or 'guesser'

  const redPlayers = roomData.players.filter((p) => p.team === 'red')
  const bluePlayers = roomData.players.filter((p) => p.team === 'blue')

  const redSpymasters = redPlayers.filter((p) => p.role === 'spymaster')
  const redGuessers = redPlayers.filter((p) => p.role === 'guesser')
  const blueSpymasters = bluePlayers.filter((p) => p.role === 'spymaster')
  const blueGuessers = bluePlayers.filter((p) => p.role === 'guesser')

  const currentTeamLabel = currentTeam === 'blue' ? 'Blau' : 'Rot'
  const hintText =
    currentTurn === 'spymaster'
      ? `${currentTeamLabel} Geheimdienstchef: Gib deinen Ermittlern einen Hinweis`
      : `${currentTeamLabel} Ermittler: Ratet basierend auf dem Hinweis`

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center' }}>Loading game...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {/* TOP ROW: 3 equal boxes (Blue Info | Spacer | Red Info) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: 6, height: 'auto', minHeight: '120px', maxHeight: '140px' }}>
        {/* BLUE TEAM INFO */}
        <div style={{ background: '#e3f2fd', border: '2px solid #1565c0', borderRadius: 6, padding: 10, overflow: 'auto', fontSize: '13px' }}>
          <div style={{ fontWeight: 700, color: '#0d47a1', marginBottom: 8, textAlign: 'center', fontSize: '14px' }}>🔵 BLAU</div>

          {/* Spymasters */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#1565c0' }}>🕵️ Geheimdienstchef</div>
            <div style={{ background: 'white', border: '1px solid #1565c0', borderRadius: 4, padding: 6, minHeight: '40px' }}>
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
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#1565c0' }}>🔍 Ermittler</div>
            <div style={{ background: 'white', border: '1px solid #1565c0', borderRadius: 4, padding: 6, minHeight: '40px' }}>
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
          <div style={{ fontWeight: 700, color: '#b71c1c', marginBottom: 8, textAlign: 'center', fontSize: '14px' }}>🔴 ROT</div>

          {/* Spymasters */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#c62828' }}>🕵️ Geheimdienstchef</div>
            <div style={{ background: 'white', border: '1px solid #c62828', borderRadius: 4, padding: 6, minHeight: '40px' }}>
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
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#c62828' }}>🔍 Ermittler</div>
            <div style={{ background: 'white', border: '1px solid #c62828', borderRadius: 4, padding: 6, minHeight: '40px' }}>
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
          {words.map((wordObj) => (
            <div
              key={wordObj.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: wordObj.revealed ? '#bbb' : '#fff',
                border: '2px solid #333',
                borderRadius: 3,
                padding: 2,
                cursor: wordObj.revealed ? 'default' : 'pointer',
                fontWeight: 600,
                fontSize: 'clamp(9px, 1.8vw, 13px)',
                textAlign: 'center',
                opacity: wordObj.revealed ? 0.5 : 1,
                transition: 'all 0.15s',
                userSelect: 'none',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                lineHeight: '1.2'
              }}
              onClick={() => {
                if (!wordObj.revealed) {
                  setWords((prev) =>
                    prev.map((w) => (w.id === wordObj.id ? { ...w, revealed: true } : w))
                  )
                }
              }}
            >
              {wordObj.word}
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM AREA - PLACEHOLDER FOR FUTURE FEATURES */}
      <div style={{ minHeight: '80px', background: '#fff', borderTop: '1px solid #ddd', padding: 8 }}>
        {/* Hier kommt später mehr rein */}
      </div>
    </div>
  )
}
