const socketio = require("socket.io");
let io;
module.exports = {
  init: (httpServer) => {
    io = socketio(httpServer);
    return io;
  },
  getIo: () => {
    if (!io) throw new Error("Client not connected");
    return io;
  },
};
