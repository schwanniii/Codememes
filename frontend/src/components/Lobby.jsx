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

async function leseDatei() {
    try {
        const response = await fetch('Namen/ganze Namen.txt');
        if (!response.ok) {
            throw new Error('Datei konnte nicht geladen werden');
        }
        const ganzeNamen = await response.text();
        window.ganzeNamen = ganzeNamen.split('\n').map(name => name.trim()).filter(name => name.length > 0);
        console.log(ganzeNamen); // Hier sind deine Daten
    } catch (error) {
        console.error('Fehler:', error);
    }
}
// HIER MUSS ICH NOCHMAL RÜBER (24.2.)

leseDatei();

// Hilfsfunktion für eine zufällige ID
const getPersistentId = () => {
  let id = localStorage.getItem('persistentPlayerId');
  if (!id) {
    id = 'p_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('persistentPlayerId', id);
  }
  return id;
};

export default function Lobby({ onGameStart }) {
  const socketRef = useRef(null)
  const [username, setUsername] = useState('')
  const [currentRoom, setCurrentRoom] = useState(null) // { code, roomData }
  const [joinCode, setJoinCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [myRole, setMyRole] = useState({ team: null, role: null })

  

useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SERVER);
    }
    const socket = socketRef.current;

    const savedRoom = localStorage.getItem('currentRoomCode');
    const savedUsername = localStorage.getItem('username');
    const pId = getPersistentId(); // Deine Hilfsfunktion nutzen!
    
    // Automatischer Rejoin beim Laden der Seite
    if (savedRoom && savedUsername) {
      socket.emit('joinRoomByCode', { 
        code: savedRoom, 
        username: savedUsername, 
        persistentId: pId 
      }, ({ success, roomData }) => {
        if (success) {
          setCurrentRoom({ code: savedRoom, roomData });
          // Falls das Spiel schon läuft, informieren wir die App.jsx
          if (roomData.status === 'playing') {
            onGameStart(roomData);
          }
        }
      });
    }

    socket.on('roomUpdated', (roomData) => {
      // Identitäts-Check mit persistentId statt Socket-ID
      const myPlayer = roomData.players.find((p) => p.persistentId === pId);
      if (myPlayer) {
        setMyRole({ team: myPlayer.team, role: myPlayer.role });
      }
      setCurrentRoom((prev) => (prev ? { code: prev.code, roomData } : { code: roomData.code, roomData }));
    });

    socket.on('gameStarted', (roomData) => {
      onGameStart(roomData);
    });



    return () => {
      socket.off('roomUpdated');
      socket.off('gameStarted');
    };
  }, [onGameStart]);




function handleCreateRoom() {
    if (!username) {
      setErrorMessage('Bitte gib einen Benutzernamen ein');
      return;
    }

    // 1. Eindeutige ID holen (aus localStorage oder neu generiert)
    const pId = getPersistentId();

    // 2. Mit persistentId an den Server senden
    socketRef.current.emit('createRoom', { username, persistentId: pId }, ({ success, code, roomData }) => {
      if (success) {
        setErrorMessage('');
        localStorage.setItem('currentRoomCode', code);
        localStorage.setItem('username', username);
        // Die persistentId ist bereits im localStorage durch getPersistentId()
        
        setCurrentRoom({ code, roomData });
      } else {
        setErrorMessage('Fehler beim Erstellen des Raums');
      }
    });
  }

  function handleJoinRoom() {
    if (!username) {
      setErrorMessage('Bitte gib einen Benutzernamen ein');
      return;
    }

    if (!joinCode || joinCode.length !== 6) {
      setErrorMessage('Ungültiger Code (muss 6 Zeichen sein)');
      return;
    }

    // 1. Eindeutige ID holen
    const pId = getPersistentId();

    // 2. Beim Join-Versuch mitsenden
    socketRef.current.emit('joinRoomByCode', { 
      code: joinCode, 
      username, 
      persistentId: pId 
    }, ({ success, code, roomData, error }) => {
      if (success) {
        setErrorMessage('');
        localStorage.setItem('currentRoomCode', code);
        localStorage.setItem('username', username);
        
        setCurrentRoom({ code, roomData });
        setJoinCode('');
      } else {
        setErrorMessage(`Fehler beim Beitreten: ${error}`);
      }
    });
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
    if (!currentRoom || !socketRef.current) return;
    
    const payload = { code: currentRoom.code, team, role };
    console.log("📡 Sende Rollen-Update an Server:", payload); 

    socketRef.current.emit('updatePlayerRole', payload, (response) => {
      if (response && response.success) {
        console.log("✅ Server hat die Rolle bestätigt.");
        setErrorMessage('');
      } else {
        const err = response?.error || 'Unbekannter Fehler';
        console.error("❌ Server lehnte Rollen-Update ab:", err);
        setErrorMessage(`Rollenwechsel fehlgeschlagen: ${err}`);
      }
    });
  }


  function randomName() {
    socketRef.current.emit('randomName', username, ({ success, name }) => {
      if (success) {
        setUsername(name);
      } else {
        setErrorMessage('Fehler beim Generieren eines zufälligen Namens');
      }});
  }


  function handleStartGame() {
    //hier bedingung einfügen, dass der host nur starten kann, wenn alle spieler eine rolle gewählt haben
    if (currentRoom && currentRoom.roomData.players.some(p => !p.team || !p.role)) {
      setErrorMessage('Alle Spieler müssen eine Rolle auswählen, bevor das Spiel gestartet werden kann.');

      setTimeout(() => {
       setErrorMessage('');
      }, 5000);

      return;

    } else {
    socketRef.current.emit('startGame', { code: currentRoom.code }, ({ success, error }) => {
      if (!success) {
        setErrorMessage(`Spielstart fehlgeschlagen: ${error}`)
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
          <strong>Spieler ({playerCount}):</strong>
          <ul style={{ margin: '8px 0', paddingLeft: 20, listStyle: 'none' }}>
            {roomData.players.map((p) => {
              const color = p.team ? teamColors[p.team] : { bg: '#f0f0f0', text: '#666' }
              return (
                <li key={p.id} style={{ padding: '6px 8px', marginBottom: 4, background: color.bg, borderLeft: `4px solid ${color.border || '#ccc'}`, borderRadius: 2 }}>
                  <span style={{ fontWeight: 600 }}>{p.username}</span>
                  {p.isHost && <span style={{ marginLeft: 8 }}>👑</span>}
                  {p.team && p.role && (
                    <span style={{ marginLeft: 8, fontSize: 12 }}>
                      ({p.team === 'blue' ? 'BLAU' : 'ROT'}) • {roleLabels[p.role]}
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
                  // transition: 'all 0.2s'
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
                  // transition: 'all 0.2s'
                }}
              >
                🔍 Ermittler
              </button>
            </div>

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
                  // transition: 'all 0.2s'
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
                  // transition: 'all 0.2s'
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
                padding: '12px 20px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ▶️ Start
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
            Raum verlassen
          </button>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
          {isHost ? '🟢 Du bist der Host. Alle Spieler sollten ihre Rollen wählen, bevor du "Start" drückst.' : '⏳ Warte, bis der Host das Spiel startet...'}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, marginBottom: 16 }}>
      <h2 style={{ fontSize: 30}}>Lobby</h2>

      {errorMessage && <div style={{ color: 'red', marginBottom: 8 }}>{errorMessage}</div>}

      <div style={{ marginBottom: 12 }}>
        <label>
          Name:
          <input
            type="text"
            value={username || ""}
            onChange={(e) => setUsername(e.target.value)}
            style={{ marginLeft: 8, padding: 6, width: 200 }}
            placeholder="Max Mustermann"
          />
          <button
          style={{
            padding: '6px 12px',
            marginLeft: 8,
            background: '#cfcfcf',
            color: '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
          onClick={randomName}
          >
            zufälliger Name
          </button>
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
          Raum erstellen
        </button>
        <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#666' }}>Erstelle einen Raum und lade Freunde mit dem Code ein.</p>
      </div>

      <div style={{ padding: 12, background: 'white', borderRadius: 4 }}>
        <div style={{ marginBottom: 8 }}>
          <label>
            Raum Code:
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
          Raum beitreten
        </button>
        <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#666' }}>Mit Code einem Raum beitreten.</p>
      </div>
    </div>
  )
}
