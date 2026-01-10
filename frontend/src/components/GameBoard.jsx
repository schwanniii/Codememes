import React, { useEffect, useState } from 'react'

export default function GameBoard({ roomData }) {
  const [words, setWords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch 25 random words
    fetch('/api/game/words')
      .then((res) => res.json())
      .then((data) => {
        setWords(data.words.map((w, i) => ({ id: i, word: w, revealed: false })))
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error loading words:', err)
        setLoading(false)
      })
  }, [])

  const gameState = roomData.gameState || { currentTeam: 'blue', turn: 'spymaster' }
  const currentTeam = gameState.currentTeam // 'blue' or 'red'
  const currentTurn = gameState.turn // 'spymaster' or 'guesser'

  const redPlayers = roomData.players.filter((p) => p.team === 'red')
  const bluePlayers = roomData.players.filter((p) => p.team === 'blue')

  const redSpymasters = redPlayers.filter((p) => p.role === 'spymaster')
  const redGuessers = redPlayers.filter((p) => p.role === 'guesser')
  const blueSpymasters = bluePlayers.filter((p) => p.role === 'spymaster')
  const blueGuessers = bluePlayers.filter((p) => p.role === 'guesser')

  // Current hint text
  const isMyTurn = currentTurn === 'spymaster'
  const currentTeamLabel = currentTeam === 'blue' ? 'Blau' : 'Rot'
  const hintText =
    currentTurn === 'spymaster'
      ? `${currentTeamLabel} Geheimdienstchef: Gib deinen Ermittlern einen Hinweis`
      : `${currentTeamLabel} Ermittler: Rätet basierend auf dem Hinweis`

  if (loading) {
    return <div style={{ padding: 16, textAlign: 'center' }}>Loading game...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f5f5', overflow: 'hidden' }}>
      {/* Hint Box */}
      <div
        style={{
          padding: 12,
          background: currentTeam === 'blue' ? '#e3f2fd' : '#ffebee',
          borderBottom: `4px solid ${currentTeam === 'blue' ? '#1565c0' : '#c62828'}`,
          textAlign: 'center',
          color: currentTeam === 'blue' ? '#0d47a1' : '#b71c1c',
          fontWeight: 600,
          fontSize: '14px'
        }}
      >
        {hintText}
      </div>

      {/* Main Game Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT TEAM (BLUE) */}
        <div
          style={{
            width: '18%',
            background: '#e3f2fd',
            borderRight: '2px solid #1565c0',
            padding: 8,
            overflow: 'auto',
            fontSize: '12px'
          }}
        >
          <div style={{ fontWeight: 600, color: '#0d47a1', marginBottom: 8, textAlign: 'center' }}>🔵 BLAU</div>

          {/* Spymasters */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#1565c0' }}>🕵️ Geheimdienstchef</div>
            <div
              style={{
                background: 'white',
                border: '1px solid #1565c0',
                borderRadius: 4,
                padding: 8,
                minHeight: 60
              }}
            >
              {blueSpymasters.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 4,
                    marginBottom: 4,
                    background: '#1565c0',
                    color: 'white',
                    borderRadius: 2,
                    fontSize: '11px',
                    textAlign: 'center'
                  }}
                >
                  {p.username}
                </div>
              ))}
            </div>
          </div>

          {/* Guessers */}
          <div>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#1565c0' }}>🔍 Ermittler</div>
            <div
              style={{
                background: 'white',
                border: '1px solid #1565c0',
                borderRadius: 4,
                padding: 8,
                minHeight: 60
              }}
            >
              {blueGuessers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 4,
                    marginBottom: 4,
                    background: '#90caf9',
                    color: '#0d47a1',
                    borderRadius: 2,
                    fontSize: '11px',
                    textAlign: 'center'
                  }}
                >
                  {p.username}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER GAME BOARD (25 WORDS) */}
        <div
          style={{
            flex: 1,
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'auto'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
              aspectRatio: '1',
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto'
            }}
          >
            {words.map((wordObj) => (
              <div
                key={wordObj.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: wordObj.revealed ? '#ccc' : '#fff',
                  border: '2px solid #333',
                  borderRadius: 4,
                  padding: 8,
                  cursor: wordObj.revealed ? 'default' : 'pointer',
                  fontWeight: 600,
                  fontSize: 'clamp(10px, 2.5vw, 18px)',
                  textAlign: 'center',
                  minHeight: '60px',
                  opacity: wordObj.revealed ? 0.6 : 1,
                  transition: 'all 0.2s',
                  userSelect: 'none'
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

        {/* RIGHT TEAM (RED) */}
        <div
          style={{
            width: '18%',
            background: '#ffebee',
            borderLeft: '2px solid #c62828',
            padding: 8,
            overflow: 'auto',
            fontSize: '12px'
          }}
        >
          <div style={{ fontWeight: 600, color: '#b71c1c', marginBottom: 8, textAlign: 'center' }}>🔴 ROT</div>

          {/* Spymasters */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#c62828' }}>🕵️ Geheimdienstchef</div>
            <div
              style={{
                background: 'white',
                border: '1px solid #c62828',
                borderRadius: 4,
                padding: 8,
                minHeight: 60
              }}
            >
              {redSpymasters.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 4,
                    marginBottom: 4,
                    background: '#c62828',
                    color: 'white',
                    borderRadius: 2,
                    fontSize: '11px',
                    textAlign: 'center'
                  }}
                >
                  {p.username}
                </div>
              ))}
            </div>
          </div>

          {/* Guessers */}
          <div>
            <div style={{ fontWeight: 600, fontSize: '11px', marginBottom: 4, color: '#c62828' }}>🔍 Ermittler</div>
            <div
              style={{
                background: 'white',
                border: '1px solid #c62828',
                borderRadius: 4,
                padding: 8,
                minHeight: 60
              }}
            >
              {redGuessers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 4,
                    marginBottom: 4,
                    background: '#ef9a9a',
                    color: '#b71c1c',
                    borderRadius: 2,
                    fontSize: '11px',
                    textAlign: 'center'
                  }}
                >
                  {p.username}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
