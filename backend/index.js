import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

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

// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);

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

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
