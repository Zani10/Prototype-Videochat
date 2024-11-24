const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

let waitingUser = null;

// Socket.io
io.on('connection', (socket) => {
  console.log('A user connected: ', socket.id);

  if (waitingUser) {
    
    io.to(waitingUser).emit('offer', { offerFrom: socket.id });
    socket.emit('offer', { offerTo: waitingUser });
    waitingUser = null;  
  } else {
    // gebruiker in de wachtrij
    waitingUser = socket.id;
  }

  socket.on('offer', (offer) => {
    socket.broadcast.emit('offer', offer);
  });

  socket.on('answer', (answer) => {
    socket.broadcast.emit('answer', answer);
  });

  socket.on('ice-candidate', (candidate) => {
    socket.broadcast.emit('ice-candidate', candidate);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected: ', socket.id);
  
    socket.broadcast.emit('user-disconnected', socket.id);
  
    if (waitingUser === socket.id) {
      waitingUser = null;
    }
  });
  
  
});

server.listen(5001, () => {
  console.log('Signaling server listening on port 5001');
});
