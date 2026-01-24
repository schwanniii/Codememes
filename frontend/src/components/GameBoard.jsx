import React, { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'

import GifPicker from '../GifPicker'
import confetti from 'canvas-confetti';

const SERVER = import.meta.env.VITE_SOCKET_URL || window.location.origin

// ========== LAYOUT CONFIGURATION - Hier kannst du die Größen anpassen ==========
const LAYOUT = {
  // Höhe der Team-Boxen oben (Blue | Center | Red)
  topTeamBoxHeight: '200px',
  
  // Abstand zwischen den 25 Karten (gap)
  cardGap: '4px',

  // Padding um das Board herum
  boardPadding: '4px',
}
// ============================================================================

export default function GameBoard({ roomData: initialRoomData }) {
  const [roomData, setRoomData] = useState(initialRoomData || null)
  const [loading, setLoading] = useState(!initialRoomData)
  const [spymasterAssignments, setSpymasterAssignments] = useState(null)
  const [socketId, setSocketId] = useState(null)
  const [hintInput, setHintInput] = useState('')
  const [numberInput, setNumberInput] = useState('1')
  const socketRef = useRef(null)
  const [activeGif, setActiveGif] = useState(null) // Für zukünftige GIF-Integration
  const [pendingGif, setPendingGif] = useState(null); // Speichert das gewählte GIF lokal
  const [selectedNumber, setSelectedNumber] = useState(() => {
    const saved = localStorage.getItem('selectedSpymasterNumber');
    return saved !== null ? saved : null;
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [pendingGuessIndex, setPendingGuessIndex] = useState(null);


  

useEffect(() => {
  // Verbindung nur einmal aufbauen
  const socket = io(SERVER);
  socketRef.current = socket;

  // Listener initial bereinigen (Sicherheitsmaßnahme)
  socket.off('displayGif');

  socket.on('connect', () => {
    const newId = socket.id;
    setSocketId(newId);
    console.log('✅ Socket verbunden:', newId);

    const savedCode = (initialRoomData && initialRoomData.code) || localStorage.getItem('currentRoomCode');
    const savedUsername = localStorage.getItem('username');
    const persistentId = localStorage.getItem('persistentPlayerId'); // WICHTIG für Reconnect

    if (savedCode && savedUsername) {
      // Wir schicken die persistentId mit, damit der Server uns erkennt!
      socket.emit('joinRoomByCode', { 
        code: savedCode, 
        username: savedUsername, 
        persistentId: persistentId 
      }, ({ success, roomData: rd, error }) => {
        if (success) {
          setRoomData(rd);
          const me = rd.players.find(p => p.persistentId === persistentId || p.username === savedUsername);
          if (me?.role === 'spymaster') {
            socket.emit('debug_getAssignments', { code: rd.code });
          }
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  });

  socket.on('roomUpdated', (rd) => {
    setRoomData(rd);
    localStorage.setItem('currentGameRoom', JSON.stringify(rd));
  });



  socket.on('updateGame', (updatedRoom) => {
  console.log("🎮 UPDATE EMPFANGEN:", updatedRoom.gameState.turn);
  
  // Wir erzwingen eine tiefe Kopie, damit React merkt: "Oh, das ist neu!"
  setRoomData(updatedRoom);
  
  // Falls das GIF lokal gecached wurde, hier sicherheitshalber löschen
  if (updatedRoom.gameState.turn === 'spymaster') {
    setPendingGif(null);
  }

  setPendingGuessIndex(null);
});




  socket.on('spymasterAssignments', ({ assignments }) => {
    console.log('🔥 FARBEN ERHALTEN:', assignments);
    setSpymasterAssignments(assignments);
  });

  socket.on('gameStarted', (rd) => {
    setRoomData(rd);
    socket.emit('debug_getAssignments', { code: rd.code });
  });

  // GIF Empfänger
  socketRef.current.on('displayGif', (data) => {
    setActiveGif(data); // Setzt url, number und username

    // Das GIF soll nach 10 Sekunden wieder verschwinden
    // setTimeout(() => {
    //   setActiveGif(null);
    // }, 10000);
  });



  socket.on('systemMessage', (m) => console.log('System:', m.text));
  socket.on('connect_error', (err) => console.error('Socket Fehler:', err));

  return () => {
    socket.off('connect');
    socket.off('roomUpdated');
    socket.off('spymasterAssignments');
    socket.off('gameStarted');
    socket.off('systemMessage');
    socket.off('displayGif');
    socket.disconnect();
  };
}, []);

// Ende useEffect



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

  const savedUsername = localStorage.getItem('username');

  // Suche den aktuellen Spieler direkt im roomData
  // WICHTIG: socketId ist asynchron, daher erst nach connect() verfügbar
  const me = (roomData?.players || []).find((p) => 
  p.id === socketId || (savedUsername && p.username === savedUsername)
  );

  // Diese Variablen sind jetzt die Basis für alles:
  const isSpymaster = me?.role === 'spymaster';
  const isGuesser = me?.role === 'guesser';
  //unwichtig ??


  const isMyTeam = me?.team === gameState.currentTeam;
  const isMyRole = me?.role === gameState.turn;




  // console.log("=== DEEP DEBUG ===");
  // console.log("SocketId:", socketId);
  // console.log("RoomData.players:", roomData?.players);
  // console.log("Alle Players IDs:", (roomData?.players || []).map(p => p.id));
  // console.log("Such nach ID:", socketId);
  // console.log("Gefundener Player (me):", me);
  // console.log("Meine Rolle im System:", me?.role);
  // console.log("Bin ich Spymaster?", isSpymaster);
  // console.log("Assignments vorhanden?", !!spymasterAssignments);
  // console.log("Code:", roomData.code);

  // console.log("=== DEBUG ENDE ===");







  // --- ERWEITERTE DEBUG LOGS //////////////////////////////////////
// console.log('=== 🛠️ DEEP SESSION DEBUG ===');

// // 1. Lokale Speicherwerte
// const localPersistentId = localStorage.getItem('persistentPlayerId');
// const localUsername = localStorage.getItem('username');
// const localRoomCode = localStorage.getItem('currentRoomCode');

// console.log('1. LOCAL STORAGE:', {
//   persistentId: localPersistentId,
//   username: localUsername,
//   roomCode: localRoomCode
// });

// // 2. Socket Status
// console.log('2. SOCKET:', {
//   currentSocketId: socketRef.current?.id,
//   isConnected: socketRef.current?.connected
// });

// // 3. Server-Daten Abgleich
// if (roomData && roomData.players) {
//   console.log('3. SERVER PLAYERS LIST:');
//   roomData.players.forEach((p, index) => {
//     const isIdMatch = p.id === socketRef.current?.id;
//     const isPersistentMatch = p.persistentId === localPersistentId;
    
//     console.log(`   [Player ${index}] ${p.username}:`, {
//       socketId: p.id,
//       persistentId: p.persistentId,
//       matchSocket: isIdMatch ? '✅ JA' : '❌ NEIN',
//       matchPersistent: isPersistentMatch ? '✅ JA' : '❌ NEIN',
//       role: p.role,
//       team: p.team
//     });
//   });

//   // 4. Identitäts-Check
//   const meById = roomData.players.find(p => p.id === socketRef.current?.id);
//   const meByPersistent = roomData.players.find(p => p.persistentId === localPersistentId);

//   console.log('4. IDENTITY RESOLUTION:', {
//     foundBySocketId: !!meById,
//     foundByPersistentId: !!meByPersistent,
//     finalMeObject: meByPersistent || meById
//   });
// } else {
//   console.log('3. SERVER DATA: No roomData or players available yet.');
// }

// // 5. Spiel-Status & Farben
// console.log('5. GAME STATE:', {
//   status: roomData?.status,
//   hasAssignments: !!spymasterAssignments,
//   assignmentsCount: spymasterAssignments ? Object.keys(spymasterAssignments).length : 0
// });

// console.log('=== 🛠️ DEBUG ENDE ===');
  

////////////////////////////////Debug Ende////////////////////////////////



  const redPlayers = (roomData.players || []).filter((p) => p.team === 'red')
  const bluePlayers = (roomData.players || []).filter((p) => p.team === 'blue')

  const redSpymasters = redPlayers.filter((p) => p.role === 'spymaster')
  const redGuessers = redPlayers.filter((p) => p.role === 'guesser')
  const blueSpymasters = bluePlayers.filter((p) => p.role === 'spymaster')
  const blueGuessers = bluePlayers.filter((p) => p.role === 'guesser')

  const currentTeamLabel = currentTeam === 'blue' ? 'Blau' : 'Rot'

  // const handleGiveHint = () => {
  //   if (!hintInput || !numberInput) {
  //     alert('Bitte Hinweis und Zahl eingeben')
  //     return
  //   }
  //   socketRef.current.emit(
  //     'giveHint',
  //     { code: roomData.code, word: hintInput, number: parseInt(numberInput) },
  //     ({ success, error }) => {
  //       if (success) {
  //         setHintInput('')
  //         setNumberInput('1')
  //       } else {
  //         alert('Hinweis fehlgeschlagen: ' + error)
  //       }
  //     }
  //   )
  // }



const handleGuessWord = (index, element) => {
  console.log("[DEBUG] Emitting guessWord for index:", index);

  socketRef.current.emit('guessWord', { code: roomData.code, index }, (response) => {
    console.log("[DEBUG] Server Response erhalten:", response);

    if (response.isCorrect) {
      console.log("[DEBUG] Konfetti wird gezündet!");
      const teamColor = roomData.gameState.currentTeam === 'blue' ? '#3f8cca' : '#e07171';
      fireConfettiAtElement(element, teamColor);
    } else {
      console.log("[DEBUG] Kein Konfetti", response.isCorrect);
    }
    
    setPendingGuessIndex(null);
  });
};


  const fireConfettiAtElement = (element, color) => {
    if (!element) return;

    // 1. Position der Karte auf dem Bildschirm holen
    const rect = element.getBoundingClientRect();

    // 2. Mittelpunkt der Karte berechnen
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 3. In relative Werte (0 bis 1) umrechnen
    const originX = centerX / window.innerWidth;
    const originY = centerY / window.innerHeight;

    console.log("fireConfettiAtElement:", { originX, originY, color });

    // 4. Konfetti abfeuern
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { x: originX, y: originY },
      colors: [color, '#ffffff'],
      gravity: 1.2,
      ticks: 150,
      scalar: 0.8 // Etwas kleineres Konfetti sieht bei Karten besser aus
    });
  };

  
  // 1. Wenn ein GIF im Picker angeklickt wird
  const handleSelectGif = (url) => {
    console.log("Vorschau-GIF ausgewählt:", url);
    setPendingGif(url); // Noch nicht senden, nur merken!
  };


  // 2. Wenn der grüne Haken gedrückt wird
  const handleConfirmClue = () => {
  if (socketRef.current && pendingGif && selectedNumber !== null) {
    socketRef.current.emit('sendGif', { 
      code: roomData.code, 
      url: pendingGif, 
      number: selectedNumber 
    });

    // Lokale States leeren
    setPendingGif(null);
    setSelectedNumber(null);
    localStorage.removeItem('selectedSpymasterNumber');
  }
};


// Für den Ermittler: Beendet die Rate-Runde komplett
const handleEndTurn = () => {
  console.log("Ermittler beendet den Zug.", roomData.code);

  if (socketRef.current && roomData?.code) {
    socketRef.current.emit('endTurn', { code: roomData.code });
  }
};



const handleCardClick = (index) => {
  const isGuesser = me?.role === 'guesser';
  const isMyTurn = roomData.gameState.turn === 'guesser' && roomData.gameState.currentTeam === me?.team;
  
  if (!isGuesser || !isMyTurn || roomData.gameState.revealed[index]) return;

  // Toggle-Logik: Wenn schon ausgewählt, dann schließe es, sonst öffne es
  setPendingGuessIndex(prevIndex => (prevIndex === index ? null : index));
};



const confirmGuess = (e, index) => {
  e.stopPropagation(); // Ganz wichtig: Verhindert, dass handleCardClick erneut feuert!
  
  socketRef.current.emit('guessWord', { code: roomData.code, index }, (response) => {
    if (response.success) {
      setPendingGuessIndex(null);
    }
  });
};





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



//   const getActivePlayer = () => {
//   // Falls die Daten noch nicht geladen sind, brich ab
//   if (!roomData?.players || !currentTurn || !currentTeam) return null;

//   return roomData.players.find((player) => {
//     // Ein Spymaster ist dran, wenn die Rolle 'spymaster' ist und sein Team dran ist
//     if (currentTurn === 'spymaster') {
//       return player.role === 'spymaster' && player.team === currentTeam;
//     }
//     // Ein Agent ist dran, wenn die Rolle 'agent' ist und sein Team dran ist
//     if (currentTurn === 'agent') {
//       return player.role === 'agent' && player.team === currentTeam;
//     }
//     return false;
//   });
// };



  // Check for game over
  const isGameOver = roomData.gameState?.winner !== null && roomData.gameState?.winner !== undefined
  const winnerLabel = gameState.winner === 'blue' ? 'Blau' : gameState.winner === 'red' ? 'Rot' : ''



  



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#f5f5f5', fontFamily: 'sans-serif', overflow: 'auto', overflowX: 'hidden' }}>
      {/* TOP ROW: Blue Team | Center Spacer | Red Team */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, padding: 4, background: '#fafafa', borderBottom: '2px solid #ddd', maxHeight: LAYOUT.topTeamBoxHeight }}>
        {/* BLUE TEAM PLAYERS */}
        <div style={{ background: '#e3f2fd', border: '2px solid #1565c0', borderRadius: 6, padding: 6, overflow: 'auto', fontSize: '10px', height: '6rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {bluePlayers.length === 0 ? (
              <div style={{ fontSize: 9, color: '#999', fontStyle: 'italic', width: '100%' }}>-</div>
            ) : (
              bluePlayers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '2px 5px',
                    background: p.role === 'spymaster' ? '#226dc2' : '#90caf9',
                    color: p.role === 'spymaster' ? 'white' : '#040a11',
                    borderRadius: 2,
                    fontSize: 11,
                    fontWeight: 550,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.username} ({p.role === 'spymaster' ? 'Chef' : 'Ermittler'})
                </div>
              ))
            )}
          </div>
        </div>

        {/* CENTER SPACER */}
        <div style={{ background: '#fff', border: '2px solid #ccc', borderRadius: 6, padding: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'start', overflow: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999' }}>Codememes</div>
        </div>

        {/* RED TEAM PLAYERS */}
        <div style={{ background: '#ffebee', border: '2px solid #d13535', borderRadius: 6, padding: 6, overflow: 'auto', fontSize: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {redPlayers.length === 0 ? (
              <div style={{ fontSize: 9, color: '#999', fontStyle: 'italic', width: '100%' }}>-</div>
            ) : (
              redPlayers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: '2px 5px',
                    background: p.role === 'spymaster' ? '#cf4646' : '#ef9a9a',
                    color: p.role === 'spymaster' ? 'white' : '#1d0606',
                    borderRadius: 2,
                    fontSize: 11,
                    fontWeight: 550,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {p.username} ({p.role === 'spymaster' ? 'Chef' : 'Ermittler'})
                </div>
              ))
            )}
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
        /* Dies war vorher der Bereich mit den Eingabefeldern. Jetzt nur noch Text. */
        <div style={{ padding: 8, background: me?.team === 'blue' ? '#cceaff' : '#ffdae0', borderBottom: `3px solid ${currentTeam === 'blue' ? '#1565c0' : '#c62828'}`, textAlign: 'center', color: currentTeam === 'blue' ? '#0d47a1' : '#b71c1c', fontWeight: 700, fontSize: 11, lineHeight: '1.3' }}>
          Gib einen Hinweis
        </div>
      ) : (
        <div style={{ padding: 5, background: currentTeam === 'blue' ? '#cceaff' : '#ffdae0', borderBottom: `3px solid ${currentTeam === 'blue' ? '#1565c0' : '#c62828'}`, textAlign: 'center', color: currentTeam === 'blue' ? '#0d47a1' : '#b71c1c', fontWeight: 300, fontSize: 11, lineHeight: '1.3' }}>
          {'Warte auf Hinweis...'}
        </div>
      )}




            {/* console.log(gameState.revealed?.[i]) */}








      

      {/* GAME BOARD: 25 WORDS (5x5) - with equal margins and rect (not square) tiles */}
      {/* <div style={{ padding: LAYOUT.boardPadding, display: 'flex', flex: 1 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: LAYOUT.cardGap,
            width: '100%',
            height: '24rem',
          }}
        >
          {(gameState.words || []).map((w, i) => {
            const revealed = gameState.revealed?.[i];
            const assignment = spymasterAssignments ? spymasterAssignments[i] : null;
            const isPending = pendingGuessIndex === index;
            
            // LOGIK FÜR DIE FARBEN
            let backgroundColor = '#fff';
            let textColor = '#000';
            let border = '2px solid #333';

            if (revealed) {
              // Wenn aufgedeckt: Volle Farbe für alle sichtbar
              if (assignment === 'blue') backgroundColor = 'rgb(63, 140, 202)';
              else if (assignment === 'red') backgroundColor = 'rgb(224, 113, 113)';
              else if (assignment === 'black') { backgroundColor = '#292929'; textColor = '#fff'; }
              else backgroundColor = '#ebd2a6';
            } else if (isSpymaster) {
              // Wenn nicht aufgedeckt, aber Spymaster: Transparenter Hintergrund oder farbiger Rahmen
              if (assignment === 'blue') backgroundColor = '#5491d6';
              else if (assignment === 'red') backgroundColor = '#c62828';
              else if (assignment === 'black') backgroundColor = '#000';
              else backgroundColor = '#d2b48c'; // Beige Rahmen
            }

            // console.log(`Word: ${w}, Revealed: ${revealed}, Assignment: ${initialRoomData.gameState.assignments}, BG: ${backgroundColor}`);

            return (
              <div
                key={i}
                onClick={() => {
                  // Nur Guesser im richtigen Team darf klicken
                  if (!revealed && currentTurn === 'guesser' && isMyRole && isMyTeam && !isGameOver) {
                    handleGuessWord(i);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: backgroundColor,
                  color: textColor,
                  border: border,
                  borderRadius: 4,
                  cursor: revealed || !isMyRole || isGameOver ? 'default' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: 'clamp(10px, 1.5vw, 14px)',
                  textAlign: 'center',
                  opacity: revealed ? 0.7 : 1, // Aufgedeckte Karten leicht blasser
                  transition: 'all 0.2s',
                  userSelect: 'none',
                  wordBreak: 'break-word',
                  padding: '4px'
                }}
              >
                {w.toUpperCase()}
              </div>
            );
          })}
        </div>
      </div> */}






      <div style={{ padding: LAYOUT.boardPadding, display: 'flex', flex: 1, background: `${me?.team === 'blue' ? '#4086d648' : '#e2696981'}` }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: LAYOUT.cardGap,
            width: '100%',
            height: '24rem',
          }}
        >
          {(gameState.words || []).map((w, i) => {
            const revealed = gameState.revealed?.[i];

            const assignment = isSpymaster && spymasterAssignments 
              ? spymasterAssignments[i] 
              : (gameState.assignments ? gameState.assignments[i] : null);

            // Prüfen, ob diese Karte gerade vorgemerkt ist
            const isPending = pendingGuessIndex === i;
            
            let backgroundColor = '#fff';
            let textColor = '#000';
            let border = isPending ? '3px solid #000' : '2px solid #333';

            // 1. Logik für AUFGEDECKTE Karten (Sichtbar für ALLE)
            if (revealed && assignment) {
              if (assignment === 'blue') { backgroundColor = 'rgb(84, 118, 212)'; }
              else if (assignment === 'red') { backgroundColor = 'rgb(228, 56, 56)'; }
              else if (assignment === 'black') { backgroundColor = '#292929'; textColor = '#fff'; }
              else if (assignment === 'neutral') { backgroundColor = '#e6b663'; }
            } 
            // 2. Logik für verdeckte Karten (Nur für Spymaster sichtbar)
            else if (isSpymaster && assignment) {
              if (assignment === 'blue') backgroundColor = 'rgb(122, 184, 235)'; // Leicht transparent
              else if (assignment === 'red') backgroundColor = 'rgb(221, 111, 111)';
              else if (assignment === 'black') backgroundColor = 'rgb(134, 134, 134)';
              else backgroundColor = 'rgb(247, 219, 171)'; //transparency auf 1
            }




            




            return (
              <div
                key={i}
                onClick={() => {
                  // Logik: Nur Guesser im richtigen Team darf die Vormerkung umschalten
                  if (!revealed && currentTurn === 'guesser' && isMyRole && isMyTeam && !isGameOver) {
                    // Toggle: Wenn schon ausgewählt, dann null, sonst i
                    setPendingGuessIndex(prev => prev === i ? null : i);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  background: backgroundColor,
                  color: textColor,
                  border: border,
                  borderRadius: 4,
                  cursor: revealed || !isMyRole || isGameOver ? 'default' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: 'clamp(12px, 2vw, 20px)',
                  textAlign: 'center',
                  // Aufgedeckte Karten sind kräftig, verdeckte Karten für Spymaster eher blass/pastell
                  opacity: 1,
                  transition: 'all 0.2s',
                  userSelect: 'none',
                  wordBreak: 'break-word',
                  padding: '4px',
                  boxShadow: revealed ? 'inset 0 0 10px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {w.toUpperCase()}
                



                {revealed && assignment !== 'neutral' && (
                  <div style={{
                    position: 'absolute',
                    border: `4px solid ${assignment === 'black' ? '#ff0000' : 'rgba(255,255,255,0.6)'}`,
                    color: assignment === 'black' ? '#ff0000' : 'rgba(255,255,255,0.8)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    fontWeight: '900',
                    fontSize: '1.1rem',
                    transform: 'rotate(-20deg)',
                    zIndex: 5,
                    pointerEvents: 'none', // Damit man nicht auf den Stempel klickt
                    fontFamily: '"Courier New", Courier, monospace', // Schreibmaschinen-Look
                    boxShadow: '2px 2px 0px rgba(0,0,0,0.2)'
                  }}>
                    {assignment === 'black' ? 'ELIMINIERT' : 'GEFUNDEN'}
                  </div>
                )}

                {/* DAS GRÜNE BESTÄTIGUNGSFELD */}
                {isPending && !revealed && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation(); // Verhindert, dass die Karte sich wieder schließt

                      const color = assignment === 'blue' ? '#3f8cca' : '#e07171';

                      const cardElement = e.currentTarget.parentElement;

                      handleGuessWord(i, cardElement, color); // Führt den eigentlichen Socket-Emit aus
                    }}
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      left: '2px',
                      right: '2px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      fontSize: '10px',
                      padding: '6px 0',
                      borderRadius: '2px',
                      zIndex: 10,
                      fontWeight: 'bold'
                    }}
                  >
                    Tippen
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>





{/*  Farben erzwingen Button zum Debuggen
      <button 
  onClick={() => socketRef.current.emit('debug_getAssignments', { code: roomData.code })}
  style={{ padding: '10px', background: 'orange', color: 'black', fontWeight: 'bold' }}
  >
  DEBUG: Farben erzwingen
      </button>

 */}



{/*  Gif anzeigen ???
      {activeGif && (
        <div style={{
          position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 9999, pointerEvents: 'none', textAlign: 'center',
          background: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 5 }}>{activeGif.username} schickt:</div>
          <img src={activeGif.url} style={{ maxWidth: '280px', borderRadius: 8 }} />
        </div>
      )} */}



    {/* GIF-ZONE (Ehemals Spymaster Input Area) */}
    <div style={{ 
      background: '#fff', 
      borderTop: `5px solid ${me?.team === 'blue' ? '#1565c0' : '#c62828'}`, 
      width: '100vw',
      minHeight: '24rem',
      overflowY: 'auto', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      padding: '10px 0',
      position: 'relative',
    }}>

      

      {/* FALL 1: Ein GIF wurde empfangen und die Ermittler sind am Zug */}
          {roomData.gameState?.currentClue ? (
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
              {/* Linke Seite: Die Zahl */}
              <div style={{ position: 'absolute', left: '20px', fontSize: '40px', fontWeight: 'bold' }}>
                {roomData.gameState.currentClue.number === 'unbegrenzt' ? '∞' : roomData.gameState.currentClue.number}
              </div>

              {/* Mitte: Das GIF */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <img src={roomData.gameState.currentClue.url} style={{ maxHeight: '180px', borderRadius: '8px' }} />
              </div>

              {/* Rechte Seite: Der Haken (Nur für aktive Ermittler) */}
              {!isSpymaster && isMyTeam && (
                <button 
                  onClick={handleEndTurn}
                  style={{ position: 'absolute', right: '20px', width: '50px', height: '50px', borderRadius: '50%', border: '3px solid green', cursor: 'pointer' }}
                >
                  ✅
                </button>
              )}
        </div>
      ) : (
        /* FALL 2: Kein GIF aktiv - Zeige Vorschau, Picker oder Warte-Status */
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          {isSpymaster && isMyTeam && isMyRole && !isGameOver ? (
            // VORSCHAU-BEREICH (Nur für den aktiven Spymaster)

            <div style={{ textAlign: 'center' }}>

              {/* Bestätigen-Knopf (Grüner Haken) */}
                {isSpymaster && isMyTeam && isMyRole && (
                  <button 
                    onClick={handleConfirmClue}
                    // Der Button ist nur klickbar, wenn ein GIF UND eine Zahl gewählt wurden
                    disabled={!pendingGif || selectedNumber === null} 
                    style={{ 
                      position: 'absolute', top: '10px', right: '5px', width: '50px', height: '50px',
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      // Visuelles Feedback: Grau wenn deaktiviert, Weiß wenn bereit
                      background: (!pendingGif || selectedNumber === null) ? '#eee' : '#fff',
                      opacity: (!pendingGif || selectedNumber === null) ? 0.6 : 1,
                      border: '2px solid grey', borderRadius: '12px', cursor: 'pointer', zIndex: 101,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '24px' }}>✅</span>
                  </button>
                )}
              
              {pendingGif && (
                <div style={{ marginBottom: '10px', position: 'relative', display: 'inline-block' }}>
                  <p style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Vorschau (nicht gesendet):</p>
                  <img src={pendingGif} style={{ height: '60px', borderRadius: '4px', border: '2px solid #4caf50' }} />
                  <div 
                    onClick={() => setPendingGif(null)} 
                    style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: 'white', borderRadius: '50%', width: '18px', height: '18px', fontSize: '12px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  >✕</div>
                </div>
              )}

              <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#2e7d32' }}>
                Gib deinem Team einen Hinweis:
              </div>

              {/* Zahlen-Picker Dropdown Container */}
              <div style={{ position: 'absolute', width: '2.5rem', height: '2.5rem', top: '10px', left: '10px' }}>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{ padding: '5px', border: '2px solid #ccc', borderRadius: '10px', cursor: 'pointer', background: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
                >
                  <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {selectedNumber !== null ? (selectedNumber === 'unbegrenzt' ? '∞' : selectedNumber) : '-'}
                  </span>
                </div>

                {isDropdownOpen && (
                  <div style={{ position: 'absolute', left: 0, marginBottom: '10px', width: '240px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', padding: '10px', zIndex: 100, display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'unbegrenzt'].map((item) => (
                      <div 
                        key={item}
                        onClick={() => {
                          setSelectedNumber(item);
                          localStorage.setItem('selectedSpymasterNumber', item);
                          setIsDropdownOpen(false); 
                        }}
                        style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedNumber === item ? '#4caf50' : '#f0f0f0', color: selectedNumber === item ? 'white' : 'black', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                      >
                        {item === 'unbegrenzt' ? '∞' : item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Wichtig: onGifSelect setzt jetzt nur den State, schickt aber nichts ab! */}
              <GifPicker onGifSelect={handleSelectGif} />
              
            </div>
          ) : (
            <div style={{ padding: '20px', color: '#999', fontStyle: 'italic', fontSize: '14px', textAlign: 'center' }}>
              {isSpymaster ? "Warte auf deinen Zug..." : "Hier empfängst du Hinweise deines Geheimdienstchefs..."}
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  )
}





      // {/* HINT BOX */}
      // {isGameOver ? (
      //   <div style={{ padding: 8, background: '#fff9c4', textAlign: 'center', fontWeight: 700, fontSize: 13, color: '#333' }}>
      //     🎉 Team {winnerLabel} gewinnt! 🎉
      //   </div>
      // ) : currentTurn === 'spymaster' && isMyRole && isMyTeam ? (
      //   <div style={{ padding: 8, background: '#e8f5e9', borderBottom: '2px solid #4caf50', display: 'flex', gap: 4, alignItems: 'center', fontSize: 11 }}>
      //     <input
      //       type="text"
      //       placeholder="Hinweis..."
      //       value={hintInput}
      //       onChange={(e) => setHintInput(e.target.value)}
      //       onKeyDown={(e) => e.key === 'Enter' && handleGiveHint()}
      //       style={{ flex: 1, padding: 5, borderRadius: 3, border: '1px solid #ccc', fontSize: 11 }}
      //     />
      //     <input
      //       type="number"
      //       min="1"
      //       max="9"
      //       value={numberInput}
      //       onChange={(e) => setNumberInput(e.target.value)}
      //       style={{ width: 45, padding: 5, borderRadius: 3, border: '1px solid #ccc', fontSize: 11 }}
      //     />
      //     <button onClick={handleGiveHint} style={{ padding: '5px 10px', background: '#4caf50', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer', fontWeight: 600, fontSize: 11 }}>
      //       Senden
      //     </button>
      //   </div>
      // ) : (
      //   <div style={{ padding: 5, background: currentTeam === 'blue' ? '#e3f2fd' : '#ffebee', borderBottom: `3px solid ${currentTeam === 'blue' ? '#1565c0' : '#c62828'}`, textAlign: 'center', color: currentTeam === 'blue' ? '#0d47a1' : '#b71c1c', fontWeight: 600, fontSize: 11, lineHeight: '1.3' }}>
      //     {gameState.hint ? `Hinweis: "${gameState.hint.word}: ${gameState.hint.number}" (${gameState.guessesRemaining} Rateversuche)` : 'Warte auf Hinweis...'}
      //   </div>
      // )}

