import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { nanoid } from "nanoid";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {}; // In-memory store

io.on("connection", (socket) => {


  // Create room
  socket.on("create_room", ({ name, question, options }) => {
    if (options.length !== 2) {
      socket.emit("error", "Poll must have 2 options");
      return;
    }

    const roomCode = nanoid(6).toUpperCase();
    const endTime = Date.now() + 60000;

    rooms[roomCode] = {
      question,
      options,
      votes: { [options[0]]: 0, [options[1]]: 0 },
      users: { [name]: { voted: null } },
      endTime,
      closed: false,
    };

    socket.join(roomCode);
    socket.emit("room_created", { roomCode, state: rooms[roomCode] });

    // Close poll after 60s
    setTimeout(() => {
      rooms[roomCode].closed = true;
      io.to(roomCode).emit("poll_closed", rooms[roomCode]);
    }, 60000);
  });

  // Join room
  socket.on("join_room", ({ name, roomCode }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }
    if (room.users[name]) {
      socket.emit("error", "Name already taken in this room");
      return;
    }

    room.users[name] = { voted: null };
    socket.join(roomCode);
    socket.emit("joined", { roomCode, state: room });
  });

  // Vote
  socket.on("vote", ({ roomCode, name, option }) => {
    const room = rooms[roomCode];
    if (!room || room.closed || Date.now() > room.endTime) {
      socket.emit("poll_closed");
      return;
    }
    if (room.users[name].voted) {
      socket.emit("already_voted");
      return;
    }
    if (!room.options.includes(option)) {
      socket.emit("error", "Invalid option");
      return;
    }

    room.votes[option]++;
    room.users[name].voted = option;

    io.to(roomCode).emit("state_updated", room);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
