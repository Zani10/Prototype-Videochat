const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      process.env.FRONTEND_URL,
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

let waitingUser = null;

// Socket.io
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('join', (data) => {
    console.log(`User ${socket.id} joining with nickname: ${data.nickname}`);
    
    if (waitingUser) {
      console.log(`Pairing ${socket.id} with ${waitingUser}`);
      const newUser = socket.id;
      const waitingUserId = waitingUser;
      waitingUser = null;
    
      
      // Send to waiting user (first user) - initiator
      io.to(waitingUserId).emit('pair', { 
        offerFrom: waitingUserId,
        offerTo: newUser,
        isInitiator: true
      });
      
      // Send to new user (second user) - responder
      io.to(newUser).emit('pair', { 
        offerFrom: waitingUserId,
        offerTo: newUser,
        isInitiator: false
      });

      console.log(`Paired: ${waitingUserId} (initiator) with ${newUser} (responder)`);
    } else {
      console.log(`No waiting user. Adding ${socket.id} to the queue.`);
      waitingUser = socket.id;
    }
  });

  // Handle offer
  socket.on('offer', (data) => {
    const { targetUser, offer } = data;
    console.log(`Offer received from ${socket.id} for targetUser: ${targetUser}`);
    if (targetUser && socket.id !== targetUser) {
      io.to(targetUser).emit('offer', { offer, from: socket.id });
    } else {
      console.error(`Invalid offer: TargetUser (${targetUser}) or Self-referential offer (${socket.id})`);
    }
  });

  // Handle answer
  socket.on('answer', (data) => {
    const { targetUser, answer } = data;
    console.log(`Answer received from ${socket.id} for targetUser: ${targetUser}`);
    if (!targetUser) {
      console.error('Answer targetUser is undefined!');
      return;
    }
    if (socket.id === targetUser) {
      console.error(`Invalid self-referential answer from ${socket.id} to ${targetUser}`);
      return;
    }
    io.to(targetUser).emit('answer', { answer, from: socket.id });
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    console.log(`ICE candidate from ${socket.id} to ${data.targetUser}`);
    io.to(data.targetUser).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (waitingUser === socket.id) {
      console.log(`Removing ${socket.id} from the queue`);
      waitingUser = null;
    } else {
      socket.broadcast.emit('user-disconnected', socket.id);
    }
  });
});

// Add error handling to the server
io.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

io.on('connect_timeout', (timeout) => {
  console.error('Connection timeout:', timeout);
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
