const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path'); // Add this line
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the project's public folder
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// For client-side routing, serve index.html for any other non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Store active rooms and users
const rooms = new Map();
const users = new Map();

// Generate unique room ID
function generateRoomId() {
  return uuidv4().split('-')[0];
}

io.on('connection', (socket) => {
  console.log('✅ New user connected:', socket.id);

  // Join a room
  socket.on('join-room', ({ roomId, userName }) => {
    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
      console.log(`🚀 Created new room: ${roomId}`);
    }
    
    const room = rooms.get(roomId);
    
    // Add user to room
    const user = {
      id: socket.id,
      name: userName || 'Guest',
      roomId,
      joinedAt: new Date(),
      isAudioOn: true,
      isVideoOn: true
    };
    
    users.set(socket.id, user);
    room.set(socket.id, user);
    
    // Join socket room
    socket.join(roomId);
    
    // Get list of other users in room
    const otherUsers = Array.from(room.values())
      .filter(u => u.id !== socket.id)
      .map(u => ({ 
        id: u.id, 
        name: u.name, 
        isAudioOn: u.isAudioOn, 
        isVideoOn: u.isVideoOn 
      }));
    
    console.log(`👤 ${user.name} joined room ${roomId}. Users in room: ${room.size}`);
    
    // Notify the user about their connection
    socket.emit('room-joined', {
      roomId,
      userId: socket.id,
      userName: user.name,
      users: otherUsers
    });
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userName: user.name,
      isAudioOn: true,
      isVideoOn: true,
      usersCount: room.size
    });
  });

  // WebRTC signaling
  socket.on('offer', ({ offer, to }) => {
    console.log(`📨 Offer from ${socket.id} to ${to}`);
    socket.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to }) => {
    console.log(`📨 Answer from ${socket.id} to ${to}`);
    socket.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    console.log(`🧊 ICE candidate from ${socket.id} to ${to}`);
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  // Handle user actions
  socket.on('user-toggle-audio', ({ userId, isAudioOn }) => {
    const user = users.get(userId);
    if (user) {
      user.isAudioOn = isAudioOn;
      console.log(`🔊 ${user.name} ${isAudioOn ? 'unmuted' : 'muted'}`);
      socket.to(user.roomId).emit('user-audio-toggled', { userId, isAudioOn });
    }
  });

  socket.on('user-toggle-video', ({ userId, isVideoOn }) => {
    const user = users.get(userId);
    if (user) {
      user.isVideoOn = isVideoOn;
      console.log(`📹 ${user.name} ${isVideoOn ? 'started video' : 'stopped video'}`);
      socket.to(user.roomId).emit('user-video-toggled', { userId, isVideoOn });
    }
  });

  socket.on('send-message', ({ roomId, message, userName }) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`💬 ${userName}: ${message}`);
    socket.to(roomId).emit('new-message', {
      userId: socket.id,
      userName,
      message,
      timestamp
    });
    socket.emit('new-message', {
      userId: socket.id,
      userName,
      message,
      timestamp
    });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      const room = rooms.get(user.roomId);
      if (room) {
        room.delete(socket.id);
        
        // Remove room if empty
        if (room.size === 0) {
          rooms.delete(user.roomId);
          console.log(`🗑️ Room ${user.roomId} deleted (empty)`);
        } else {
          // Notify others in the room
          socket.to(user.roomId).emit('user-left', {
            userId: socket.id,
            userName: user.name,
            usersCount: room.size
          });
          console.log(`👋 ${user.name} left room ${user.roomId}. Remaining: ${room.size}`);
        }
      }
      users.delete(socket.id);
    }
    console.log('❌ User disconnected:', socket.id);
  });

  // Create new room
  socket.on('create-room', ({ userName }) => {
    const roomId = generateRoomId();
    rooms.set(roomId, new Map());
    console.log(`🆕 Room created: ${roomId} by ${userName}`);
    socket.emit('room-created', { roomId, userName });
  });

  // Get room info
  socket.on('get-room-info', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      socket.emit('room-info', {
        exists: true,
        usersCount: room.size,
        users: Array.from(room.values())
      });
    } else {
      socket.emit('room-info', { exists: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`📱 Share this link to invite others!`);
});