import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Serve frontend static files from dist/
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

const PORT = process.env.PORT || 3000;

// Load words from alleBegriffe.txt
let allWords = [];
try {
  const wordsPath = path.join(__dirname, '..', 'alleBegriffe.txt');
  const content = fs.readFileSync(wordsPath, 'utf-8');
  allWords = content
    .split(',')
    .map((w) => w.trim())
    .filter((w) => w.length > 0);
  console.log(`Loaded ${allWords.length} words from alleBegriffe.txt`);
} catch (err) {
  console.error('Error loading words:', err.message);
}

// In-Memory Room Storage
const rooms = new Map();

// Utility: Generate 6-char room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Utility: Select random items from array
function selectRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function fromGuesserToSpymaster(roomData) {
  
  roomData.gameState.currentClue = null; // WICHTIG: GIF entfernen
  roomData.gameState.currentTeam = roomData.gameState.currentTeam === 'blue' ? 'red' : 'blue';
  roomData.gameState.turn = 'spymaster';
  roomData.gameState.guessesRemaining = 0;
  roomData.gameState.hint = null; // Falls du das alte System noch mitschleppst
}


// Health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mock video list - demo only
app.get('/api/videos', (req, res) => {
  const videos = [
    {
      id: 'v1',
      title: 'Flower (Demo)',
      thumbnail: 'https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?auto=format&fit=crop&w=240&q=60',
      videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      source: 'MDN CC0'
    },
    {
      id: 'v2',
      title: 'Big Buck Bunny (Demo)',
      thumbnail: 'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=240&q=60',
      videoUrl: 'https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p_1mb.mp4',
      source: 'Sample Videos'
    }
  ];
  res.json(videos);
});

// Game words endpoint - returns 25 random unique words
app.get('/api/game/words', (req, res) => {
  if (allWords.length < 25) {
    return res.status(400).json({ error: 'Not enough words loaded' });
  }
  const words = selectRandomItems(allWords, 25);
  res.json({ words });
});

// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);


  ///////////////////  // DEBUG EVENTS /////////////////////

  socket.on('debug_getAssignments', ({ code }) => {
  const roomData = rooms.get(code);
  if (roomData && roomData.gameState && roomData.gameState.assignments) {
    console.log(`Debug: Sending assignments for room ${code} to socket ${socket.id}`);
    socket.emit('spymasterAssignments', { assignments: roomData.gameState.assignments });
  } else {
    console.log(`Debug: No assignments found for room ${code}`);
  }
});


///////////////////  END DEBUG EVENTS /////////////////////






  // === LEGACY EVENTS (für alte Demo) ===
  socket.on('joinRoom', ({ room }) => {
    socket.join(room);
    io.to(room).emit('systemMessage', { text: `User ${socket.id} joined ${room}` });
  });

  socket.on('leaveRoom', ({ room }) => {
    socket.leave(room);
    io.to(room).emit('systemMessage', { text: `User ${socket.id} left ${room}` });
  });

  socket.on('chatMessage', ({ room, text }) => {
    io.to(room).emit('chatMessage', { id: socket.id, text });
  });

  // === LOBBY EVENTS ===
  socket.on('createRoom', ({ username, persistentId }, callback) => {
  const code = generateRoomCode(); // Erzeugt deinen 6-stelligen Code
  
  const hostPlayer = {
    id: socket.id,
    persistentId: persistentId, // Wichtig für den Wiederbeitritt
    username: username,
    isHost: true,
    team: null,
    role: null
  };

  const roomData = {
    code: code,
    host: socket.id,
    hostPersistentId: persistentId, // Wir binden den Host-Status an die ID
    players: [hostPlayer],
    status: 'waiting', // oder 'lobby'
    gameState: {
      words: [],
      assignments: null,
      turn: '',
      foundWords: [],
      currentClue: null
    }
  };

  rooms.set(code, roomData);
  socket.join(code);

  console.log(`🏠 Raum erstellt: ${code} von ${username} (${persistentId})`);
  
  callback({
    success: true,
    code: code,
    roomData: roomData,
  });
});



socket.on('joinRoomByCode', ({ code, username, persistentId }, callback) => {
  const roomCode = code?.toUpperCase();
  const room = rooms.get(roomCode);

  if (!room) {
    return callback({ success: false, error: 'Raum nicht gefunden' });
  }

  // Identitäts-Check: Existiert diese Person schon im Raum?
  let player = room.players.find(p => p.persistentId === persistentId);

  if (player) {
    // FALL A: RECONNECT (Seite neu geladen)
    console.log(`♻️ Spieler ${username} kehrt zurück. Update Socket: ${player.id} -> ${socket.id}`);
    player.id = socket.id;
    player.username = username; // Update, falls Name im Input geändert wurde
    socket.username = username;
    
    // Falls der Rückkehrer der ursprüngliche Host war, Status sicherstellen
    if (room.hostPersistentId === persistentId) {
      player.isHost = true;
      room.host = socket.id; 
    }
  } else {
    // FALL B: NEUER SPIELER tritt bei
    player = {
      id: socket.id,
      persistentId: persistentId,
      username: username,
      isHost: false,
      team: null,
      role: null
    };
    room.players.push(player);
    console.log(`👤 Neuer Spieler ${username} beigetreten: ${roomCode}`);
  }

  socket.join(roomCode);

  // WICHTIG: Wenn das Spiel läuft und der Spieler Spymaster ist, 
  // schicken wir ihm sofort die Farben (Assignments)
  if (room.status === 'playing' && player.role === 'spymaster' && room.gameState.assignments) {
    socket.emit('spymasterAssignments', { assignments: room.gameState.assignments });
  }

  // Erfolgs-Antwort an den Client
  callback({
    success: true,
    code: roomCode,
    roomData: room
  });

  // Alle anderen im Raum informieren
  io.to(roomCode).emit('roomUpdated', room);
});


  socket.on('leaveRoomByCode', ({ code }) => {
    const roomData = rooms.get(code);
    if (!roomData) return;

    roomData.players = roomData.players.filter((p) => p.id !== socket.id);
    socket.leave(code);

    if (roomData.players.length === 0) {
      rooms.delete(code);
      console.log(`Room ${code} deleted (empty)`);
    } else {
      const safe = JSON.parse(JSON.stringify(roomData));
      if (safe.gameState) delete safe.gameState.assignments;
      io.to(code).emit('roomUpdated', safe);
      io.to(code).emit('systemMessage', { text: 'A player left' });
    }
  });

  socket.on('startGame', ({ code }, callback) => {
    const roomData = rooms.get(code);
    if (!roomData) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    if (roomData.host !== socket.id) {
      callback({ success: false, error: 'Only host can start game' });
      return;
    }

    // Generate 25 unique words for this game
    if (allWords.length < 25) {
      callback({ success: false, error: 'Not enough words' });
      return;
    }

    const gameWords = selectRandomItems(allWords, 25);

    // Assign teams: randomly choose starting team which gets 9 cards
    const indices = Array.from({ length: 25 }, (_, i) => i).sort(() => Math.random() - 0.5);
    const blackIndex = indices.shift();
    const startingTeam = Math.random() < 0.5 ? 'blue' : 'red';
    const counts = { blue: startingTeam === 'blue' ? 9 : 8, red: startingTeam === 'red' ? 9 : 8 };

    const assignments = Array(25).fill('neutral');
    assignments[blackIndex] = 'black';

    // assign starting team
    for (let i = 0; i < counts[startingTeam]; i++) {
      const idx = indices.shift();
      assignments[idx] = startingTeam;
    }

    // assign other team
    const other = startingTeam === 'blue' ? 'red' : 'blue';
    for (let i = 0; i < counts[other]; i++) {
      const idx = indices.shift();
      assignments[idx] = other;
    }

    // remaining are neutral (already set)

    // compute remaining counts
    const remainingBlue = assignments.filter((a) => a === 'blue').length;
    const remainingRed = assignments.filter((a) => a === 'red').length;

    roomData.status = 'playing';
    roomData.gameState = {
      round: 1,
      currentTeam: startingTeam,
      turn: 'spymaster', // 'spymaster' or 'guesser'
      words: gameWords,
      assignments,
      revealed: Array(25).fill(false),
      remaining: { blue: remainingBlue, red: remainingRed },
      hint: null, // { word, number }
      guessesRemaining: 0, // will be set after hint
      winner: null // null, 'blue', 'red'
    };

    console.log(`Game started in room ${code}. Starting team: ${startingTeam}`);

    callback({ success: true });
    // Broadcast sanitized gameStarted (remove assignments)
    const safeRoom = JSON.parse(JSON.stringify(roomData));
    if (safeRoom.gameState) delete safeRoom.gameState.assignments;
    io.to(code).emit('gameStarted', safeRoom);

    // Send assignments privately to spymasters
    const spies = roomData.players.filter((p) => p.role === 'spymaster');
    spies.forEach((s) => {
      io.to(s.id).emit('spymasterAssignments', { assignments: roomData.gameState.assignments });
    });
  });



//   // Wenn der Spymaster seinen Hinweis bestätigt
// socket.on('sendGif', ({ code, url, number }) => {
//   console.log(`backend empfangen`, code, url, number);


//   const room = rooms.get(code);
//   if (room) {
//     // Speichern im gameState
//     room.gameState.currentClue = {
//       url: url,
//       number: number,
//       username: socket.username || 'Chef'
//     };
    
//     // Phase ändern
//     room.gameState.turn = 'guesser';

//     io.to(code).emit('updateGame', room);
//   }
// });
// server/index.js

socket.on('sendGif', (data) => {
  console.log("1. Backend empfangen:", data);
  const { code, url, number } = data;
  const room = rooms.get(code);

  if (room && room.gameState) {
    // Clue setzen
    room.gameState.currentClue = {
      url: url,
      number: number,
      username: socket.username || 'Chef'
    };
    
    // TURN ÄNDERN
    room.gameState.turn = 'guesser';
    // GUESSES SETZEN (Wichtig!)
    room.gameState.guessesRemaining = (number === 'unbegrenzt') ? 99 : (parseInt(number) + 1);

    console.log("2. Status geändert. Neuer Turn:", room.gameState.turn);

    // WICHTIG: Wir senden an BEIDE Events, damit wir jede Gegenstelle erreichen
    io.to(code).emit('updateGame', room);
    io.to(code).emit('roomUpdated', room); 
    
    console.log("3. Updates an Raum gesendet:", code);
  } else {
    console.log("❌ FEHLER: Raum oder GameState nicht gefunden für Code:", code);
  }
});

























// Wenn Ermittler auf den Haken drückt
socket.on('endTurn', ({ code }) => {
  const room = rooms.get(code);
  if (room) {
    fromGuesserToSpymaster(room);

    io.to(code).emit('updateGame', room);

    console.log("🔄 Turn ended by guesser, back to spymaster.");
  }
});





  // Spymaster gives a hint
  socket.on('giveHint', ({ code, word, number }, callback) => {
    const roomData = rooms.get(code);
    if (!roomData || !roomData.gameState) {
      if (callback) callback({ success: false, error: 'Room or game not found' });
      return;
    }

    const gs = roomData.gameState;
    if (gs.turn !== 'spymaster') {
      if (callback) callback({ success: false, error: 'Not spymaster turn' });
      return;
    }

    // Check that caller is a spymaster for current team
    const caller = roomData.players.find((p) => p.id === socket.id);
    if (!caller || caller.role !== 'spymaster' || caller.team !== gs.currentTeam) {
      if (callback) callback({ success: false, error: 'Only current spymaster can give hint' });
      return;
    }

    // Validate hint
    if (!word) {
      if (callback) callback({ success: false, error: 'Invalid hint' });
      return;
    }

    gs.hint = { word, number };
    gs.guessesRemaining = number + 1; // Can guess up to number + 1 times
    gs.turn = 'guesser';

    console.log(`Spymaster ${socket.id} gave hint "${word}: ${number}" for team ${gs.currentTeam}`);

    const safeRoom = JSON.parse(JSON.stringify(roomData));
    if (safeRoom.gameState) delete safeRoom.gameState.assignments;
    io.to(code).emit('roomUpdated', safeRoom);
    if (callback) callback({ success: true });
  });




  // Guesser guesses a word
  socket.on('guessWord', ({ code, index }, callback) => {
    const roomData = rooms.get(code);
    if (!roomData || !roomData.gameState) {
      if (callback) callback({ success: false, error: 'Room or game not found' });
      return;
    }

    const gs = roomData.gameState;
    if (gs.turn !== 'guesser' || gs.guessesRemaining <= 0) {
      if (callback) callback({ success: false, error: 'Cannot guess now' });
      return;
    }

    if (gs.revealed[index]) {
      if (callback) callback({ success: false, error: 'Card already revealed' });
      return;
    }

    // Karte aufdecken und Versuche abziehen
    gs.revealed[index] = true;
    gs.guessesRemaining--;
    const assignment = gs.assignments[index];

    let message = '';
    let turnEnds = false;
  


    if (assignment === 'black') {
      gs.winner = gs.currentTeam === 'blue' ? 'red' : 'blue';
      roomData.status = 'finished';
      message = `Assassin! Team ${gs.currentTeam} loses!`;
      turnEnds = true;
    } else if (assignment === gs.currentTeam) {
      gs.remaining[gs.currentTeam]--;
      message = `Correct! Team ${gs.currentTeam} found an agent.`;
      if (gs.remaining[gs.currentTeam] === 0) {
        gs.winner = gs.currentTeam;
        roomData.status = 'finished';
        message = `Team ${gs.currentTeam} wins!`;
      }
    } else if (assignment === 'neutral') {
      message = `Neutral! Turn ends.`;
      turnEnds = true;
    } else {
      gs.remaining[assignment]--;
      message = `Wrong! Team ${assignment} agent. Turn ends.`;
      turnEnds = true;
      if (gs.remaining[assignment] === 0) {
        gs.winner = assignment;
        roomData.status = 'finished';
        message = `Team ${assignment} wins!`;
      }
    }

    // Phase wechseln, wenn der Zug vorbei ist oder das Team gewechselt werden muss
    if (turnEnds || gs.guessesRemaining === 0) {
      if (gs.winner === null) {
        fromGuesserToSpymaster(roomData);
      }
    }

    console.log(`Word ${index} guessed: ${assignment}. ${message}`);

    // --- DATEN-FILTERUNG FÜR NORMALE SPIELER ---
    const safeRoom = JSON.parse(JSON.stringify(roomData));
    if (safeRoom.gameState) {
  // Wir stellen sicher, dass assignments existiert und befüllt wird
  safeRoom.gameState.assignments = gs.assignments.map((a, i) => {
    // Wenn die Karte aufgedeckt ist ODER das Spiel vorbei ist, Farbe zeigen
    return (gs.revealed[i] || gs.winner) ? a : null;
    });
  }

    // Sende den gefilterten Raum an alle
    io.to(code).emit('roomUpdated', safeRoom);
    io.to(code).emit('systemMessage', { text: message });

    // --- VOLLSTÄNDIGE DATEN NUR FÜR SPYMASTER ---
    const spies = roomData.players.filter((p) => p.role === 'spymaster');
    spies.forEach((s) => {
      io.to(s.id).emit('spymasterAssignments', { assignments: roomData.gameState.assignments });
    });

    if (callback) {
      callback({ 
        success: true,
        isCorrect: assignment === gs.currentTeam
    });
  }
  });







socket.on('updatePlayerRole', ({ code, team, role }, callback) => {
  console.log("hallo");
  console.log("halt dich an mir fest, wenn das leben dich runterzieht, wow gänsehaut");

  const roomData = rooms.get(code.toUpperCase());
  if (!roomData) return callback?.({ success: false, error: 'Room not found' });

  // WICHTIG: Wir suchen den Spieler diesmal NICHT nur über die ID, 
  // sondern wir nehmen den Player-Slot, der für diesen Socket reserviert sein sollte
  // oder suchen über den Namen, falls vorhanden.
  let player = roomData.players.find((p) => p.id === socket.id);

  // Falls nicht gefunden (ID Mismatch!), versuchen wir den Host zu retten 
  // oder nutzen den ersten Spieler im Raum (für Single-Player Tests)
  if (!player && roomData.players.length > 0) {
    console.log("⚠️ ID Mismatch erkannt! Korrigiere Player-ID auf:", socket.id);
    player = roomData.players[0]; // In der Testphase nehmen wir den ersten Slot
    player.id = socket.id;
  }

  if (player) {
    player.team = team;
    player.role = role;
    console.log(`✅ Role Update: ${player.username} ist jetzt ${role}`);
    callback?.({ success: true });
  } else {
    return callback?.({ success: false, error: 'Player not found in room' });
  }

  const safe = JSON.parse(JSON.stringify(roomData));
  if (safe.gameState) delete safe.gameState.assignments;
  io.to(code).emit('roomUpdated', safe);
});

  socket.on('disconnect', () => {
  console.log('Socket disconnected:', socket.id);
  
    // Lösche den Raum NICHT sofort. Warte 5 Sekunden, ob der Host zurückkommt.
    rooms.forEach((room, code) => {
      const player = room.players.find(p => p.id === socket.id);
      if (player && player.isHost) {
        console.log(`Host ${player.username} disconnected. Waiting for reconnect...`);
        setTimeout(() => {
          const currentRoom = rooms.get(code);
          // Prüfe, ob der Host immer noch offline ist (id hat sich nicht erneuert)
          if (currentRoom && !currentRoom.players.some(p => p.isHost && io.sockets.sockets.get(p.id)?.connected)) {
            console.log(`Room ${code} deleted (host timeout)`);
            rooms.delete(code);
            io.to(code).emit('systemMessage', { text: 'Raum wurde geschlossen, da der Host nicht zurückgekehrt ist.' });
          }
        }, 5000); // 5 Sekunden Kulanzzeit
      }
    });
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
