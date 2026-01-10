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
  socket.on('createRoom', ({ username }, callback) => {
    const code = generateRoomCode();
    const roomData = {
      code,
      host: socket.id,
      hostName: username || 'Host',
      players: [{ 
        id: socket.id, 
        username: username || 'Host', 
        isHost: true,
        team: null,      // 'red' or 'blue'
        role: null       // 'spymaster' or 'guesser'
      }],
      status: 'waiting', // waiting, playing, finished
      gameState: null
    };

    rooms.set(code, roomData);
    socket.join(code);

    console.log(`Room created: ${code} by ${socket.id}`);

    callback({ success: true, code, roomData });
    // Broadcast sanitized room (no assignments yet)
    const safe = JSON.parse(JSON.stringify(roomData));
    if (safe.gameState) delete safe.gameState.assignments;
    io.to(code).emit('roomUpdated', safe);
  });

  socket.on('joinRoomByCode', ({ code, username }, callback) => {
    const roomData = rooms.get(code.toUpperCase());

    if (!roomData) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    if (roomData.status !== 'waiting' && roomData.status !== 'playing') {
      callback({ success: false, error: 'Game not available' });
      return;
    }

    roomData.players.push({ 
      id: socket.id, 
      username: username || 'Player', 
      isHost: false,
      team: null,      // 'red' or 'blue'
      role: null       // 'spymaster' or 'guesser'
    });
    socket.join(code);

    console.log(`User ${socket.id} joined room ${code}`);

    callback({ success: true, code, roomData });
    const safe = JSON.parse(JSON.stringify(roomData));
    if (safe.gameState) delete safe.gameState.assignments;
    io.to(code).emit('roomUpdated', safe);
    io.to(code).emit('systemMessage', { text: `${username} joined the room` });

    // If game is in progress and this player was a spymaster before, send assignments
    if (roomData.gameState && roomData.gameState.assignments) {
      const newPlayer = roomData.players[roomData.players.length - 1];
      if (newPlayer.role === 'spymaster') {
        io.to(socket.id).emit('spymasterAssignments', { assignments: roomData.gameState.assignments });
      }
    }
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
    if (!word || number < 1 || number > 25) {
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

    gs.revealed[index] = true;
    gs.guessesRemaining--;
    const assignment = gs.assignments[index];

    let message = '';
    let turnEnds = false;

    if (assignment === 'black') {
      // Assassin! Team loses immediately
      gs.winner = gs.currentTeam === 'blue' ? 'red' : 'blue';
      roomData.status = 'finished';
      message = `Assassin! Team ${gs.currentTeam} loses!`;
      turnEnds = true;
    } else if (assignment === gs.currentTeam) {
      // Correct guess for current team
      gs.remaining[gs.currentTeam]--;
      message = `Correct! Team ${gs.currentTeam} found an agent.`;

      // Check if team won
      if (gs.remaining[gs.currentTeam] === 0) {
        gs.winner = gs.currentTeam;
        roomData.status = 'finished';
        message = `Team ${gs.currentTeam} wins!`;
      }
      // Else: team can continue guessing (guessesRemaining checked above)
    } else if (assignment === 'neutral') {
      // Hit a bystander
      message = `Neutral! Turn ends.`;
      turnEnds = true;
    } else {
      // Hit opponent's agent
      gs.remaining[assignment]--;
      message = `Wrong! Team ${assignment} agent. Turn ends.`;
      turnEnds = true;

      // Check if opponent won (unlikely but possible)
      if (gs.remaining[assignment] === 0) {
        gs.winner = assignment;
        roomData.status = 'finished';
        message = `Team ${assignment} wins!`;
      }
    }

    // End turn and switch if needed
    if (turnEnds || gs.guessesRemaining === 0 || (assignment === gs.currentTeam && gs.remaining[gs.currentTeam] === 0)) {
      if (gs.winner === null) {
        // Switch teams
        gs.currentTeam = gs.currentTeam === 'blue' ? 'red' : 'blue';
        gs.turn = 'spymaster';
        gs.hint = null;
        gs.guessesRemaining = 0;
      }
    }

    console.log(`Word ${index} guessed: ${assignment}. ${message}`);

    const safeRoom = JSON.parse(JSON.stringify(roomData));
    if (safeRoom.gameState) delete safeRoom.gameState.assignments;
    io.to(code).emit('roomUpdated', safeRoom);
    io.to(code).emit('systemMessage', { text: message });

    // Send updated assignments to spymasters
    const spies = roomData.players.filter((p) => p.role === 'spymaster');
    spies.forEach((s) => {
      io.to(s.id).emit('spymasterAssignments', { assignments: roomData.gameState.assignments });
    });

    if (callback) callback({ success: true });
  });



  socket.on('updatePlayerRole', ({ code, team, role }, callback) => {
    const roomData = rooms.get(code);
    if (!roomData) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    const player = roomData.players.find((p) => p.id === socket.id);
    if (!player) {
      callback({ success: false, error: 'Player not in room' });
      return;
    }

    player.team = team;
    player.role = role;

    console.log(`Player ${socket.id} changed role to ${team}-${role}`);

    callback({ success: true });
    const safe = JSON.parse(JSON.stringify(roomData));
    if (safe.gameState) delete safe.gameState.assignments;
    io.to(code).emit('roomUpdated', safe);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);

    // Remove player from all rooms
    for (const [code, roomData] of rooms.entries()) {
      roomData.players = roomData.players.filter((p) => p.id !== socket.id);

      if (roomData.players.length === 0) {
        rooms.delete(code);
        console.log(`Room ${code} deleted (host disconnected)`);
      } else {
        if (roomData.host === socket.id) {
          // Host disconnected - assign new host
          roomData.host = roomData.players[0].id;
          roomData.players[0].isHost = true;
        }
        const safe = JSON.parse(JSON.stringify(roomData));
        if (safe.gameState) delete safe.gameState.assignments;
        io.to(code).emit('roomUpdated', safe);
        io.to(code).emit('systemMessage', { text: 'A player disconnected' });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
