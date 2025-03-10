const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const cors = require('cors');
require('dotenv').config();
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Socket.io for real-time chat
io.on('connection', (socket) => {
  socket.on('joinDoc', (docId) => {
    socket.join(docId);
  });

  socket.on('textUpdate', ({ docId, content }) => {
    socket.to(docId).emit('textUpdate', content);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});