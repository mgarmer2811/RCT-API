let io = null;

function init(server) {
  if (io) return io;
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PATCH", "DELETE"] },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join", ({ userId, familyId } = {}) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
      if (familyId) {
        socket.join(`family_${familyId}`);
      }
      socket.emit("joined", { joined: true });
    });

    socket.on("leave", ({ userId, familyId } = {}) => {
      if (userId) socket.leave(`user_${userId}`);
      if (familyId) socket.leave(`family_${familyId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", socket.id, reason);
    });
  });

  return io;
}

function getIo() {
  if (!io)
    throw new Error("Socket.io not initialized. Call init(server) first");
  return io;
}

module.exports = { init, getIo };
