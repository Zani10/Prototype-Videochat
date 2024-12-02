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

  socket.on("join", ({ nickname }) => {
    console.log('User joined:', nickname);
    socket.broadcast.emit("user:joined", {
      userId: socket.id,
      nickname: nickname
    });
  });

  socket.on("offer", ({ to, offer }) => {
    socket.to(to).emit("offer", {
      from: socket.id,
      offer: offer
    });
  });

  socket.on("answer", ({ to, answer }) => {
    socket.to(to).emit("answer", {
      from: socket.id,
      answer: answer
    });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    socket.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate: candidate
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
