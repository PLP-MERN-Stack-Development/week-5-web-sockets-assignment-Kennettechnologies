// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const expressFileUpload = require('express-fileupload');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressFileUpload());

// Store connected users and messages
const users = {};
const messages = [];
const typingUsers = {};
const userRooms = {}; // Track which room each user is in

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining
  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.id };
    userRooms[socket.id] = 'General'; // Default room
    socket.join('General');
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.id });
    console.log(`${username} joined the chat`);
  });

  // Handle joining a room
  socket.on('join_room', (room) => {
    const prevRoom = userRooms[socket.id];
    if (prevRoom) {
      socket.leave(prevRoom);
    }
    socket.join(room);
    userRooms[socket.id] = room;
    // Optionally notify users in the room
  });

  // Handle chat messages (room-aware)
  socket.on('send_message', (messageData) => {
    const room = messageData.room || userRooms[socket.id] || 'General';
    const message = {
      ...messageData,
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
      room,
      readBy: [users[socket.id]?.username], // Sender has read their own message
    };
    messages.push(message);
    if (messages.length > 100) {
      messages.shift();
    }
    io.to(room).emit('receive_message', message);
  });

  // Handle typing indicator (room-aware)
  socket.on('typing', (isTyping) => {
    if (users[socket.id]) {
      const username = users[socket.id].username;
      if (isTyping) {
        typingUsers[socket.id] = username;
      } else {
        delete typingUsers[socket.id];
      }
      // Optionally, emit to room only
      io.emit('typing_users', Object.values(typingUsers));
    }
  });

  // Handle private messages (with read receipts)
  socket.on('private_message', ({ to, message }) => {
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
      readBy: [users[socket.id]?.username],
    };
    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
    messages.push(messageData);
    if (messages.length > 100) {
      messages.shift();
    }
  });

  // Handle read receipts
  socket.on('read_message', (messageId) => {
    const user = users[socket.id]?.username;
    const msg = messages.find((m) => m.id === messageId);
    if (msg && user && !msg.readBy?.includes(user)) {
      msg.readBy = msg.readBy || [];
      msg.readBy.push(user);
      // Notify sender (for private) or room (for room messages)
      if (msg.isPrivate) {
        io.to(msg.senderId).emit('message_read', { messageId, readBy: msg.readBy });
      } else if (msg.room) {
        io.to(msg.room).emit('message_read', { messageId, readBy: msg.readBy });
      }
    }
  });

  // Handle message reactions
  socket.on('react_message', ({ messageId, reaction, username }) => {
    const msg = messages.find((m) => m.id === messageId);
    if (msg) {
      msg.reactions = msg.reactions || {};
      msg.reactions[reaction] = msg.reactions[reaction] || [];
      if (!msg.reactions[reaction].includes(username)) {
        msg.reactions[reaction].push(username);
      }
      // Notify all clients about the updated reactions
      if (msg.isPrivate) {
        io.to(msg.senderId).emit('message_reacted', { messageId, reactions: msg.reactions });
      } else if (msg.room) {
        io.to(msg.room).emit('message_reacted', { messageId, reactions: msg.reactions });
      } else {
        io.emit('message_reacted', { messageId, reactions: msg.reactions });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (users[socket.id]) {
      const { username } = users[socket.id];
      io.emit('user_left', { username, id: socket.id });
      console.log(`${username} left the chat`);
    }
    delete users[socket.id];
    delete typingUsers[socket.id];
    delete userRooms[socket.id];
    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
  });
});

// API routes
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

// File upload endpoint
app.post('/api/upload', (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const file = req.files.file;
  const uploadPath = path.join(__dirname, 'public', file.name);
  file.mv(uploadPath, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ url: `/public/${file.name}` });
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io }; 