const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",  // Vite standaardpoort voor React
    methods: ["GET", "POST"]
  }
});

// Socket.io logica
io.on('connection', (socket) => {
  console.log('A user connected: ', socket.id);

  // Wanneer een gebruiker een offer verstuurt
  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  // Wanneer een gebruiker een answer verstuurt
  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });

  // Wanneer ICE-candidates verstuurd worden
  socket.on('ice-candidate', (candidate) => {
    socket.broadcast.emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected: ', socket.id);
  });
});

// Start de server op poort 5000
server.listen(5001, () => {
  console.log('Signaling server listening on port 5001');
});

