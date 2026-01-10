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
    io.to(code).emit('roomUpdated', roomData);
  });

  socket.on('joinRoomByCode', ({ code, username }, callback) => {
    const roomData = rooms.get(code.toUpperCase());

    if (!roomData) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    if (roomData.status !== 'waiting') {
      callback({ success: false, error: 'Game already started' });
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
    io.to(code).emit('roomUpdated', roomData);
    io.to(code).emit('systemMessage', { text: `${username} joined the room` });
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
      io.to(code).emit('roomUpdated', roomData);
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

    roomData.status = 'playing';
    roomData.gameState = { 
      round: 1, 
      currentTeam: 'blue', 
      turn: 'spymaster',
      words: gameWords
    };

    console.log(`Game started in room ${code}`);

    callback({ success: true });
    io.to(code).emit('gameStarted', roomData);
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
    io.to(code).emit('roomUpdated', roomData);
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
        io.to(code).emit('roomUpdated', roomData);
        io.to(code).emit('systemMessage', { text: 'A player disconnected' });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
