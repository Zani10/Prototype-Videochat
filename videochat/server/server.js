const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://prototype-videochat-1.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  }
});

app.use(cors({
  origin: "https://prototype-videochat-1.onrender.com",
  credentials: true
}));

let waitingUser = null;

// Socket.io
io.on('connection', (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join:room", ({ nickname }) => {
    socket.nickname = nickname;
    // Notify other users in the room
    socket.broadcast.emit("user:joined", {
      userId: socket.id,
      nickname: nickname
    });
    
    // Send list of existing users to the new user
    const existingUsers = Array.from(io.sockets.sockets.values())
      .filter(s => s.id !== socket.id && s.nickname)
      .map(s => ({
        userId: s.id,
        nickname: s.nickname
      }));
    
    socket.emit("users:existing", existingUsers);
  });

  socket.on("webrtc:offer", ({ to, offer }) => {
    socket.to(to).emit("webrtc:offer", {
      from: socket.id,
      offer
    });
  });

  socket.on("webrtc:answer", ({ to, answer }) => {
    socket.to(to).emit("webrtc:answer", {
      from: socket.id,
      answer
    });
  });

  socket.on("webrtc:ice-candidate", ({ to, candidate }) => {
    socket.to(to).emit("webrtc:ice-candidate", {
      from: socket.id,
      candidate
    });
  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("user:left", {
      userId: socket.id,
      nickname: socket.nickname
    });
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
