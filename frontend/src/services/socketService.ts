import { io, Socket } from "socket.io-client";

// Point this to our Express/Socket.io backend running on port 5001
const SOCKET_URL = "http://localhost:5001";

// Initialize the socket connection
const socket: Socket = io(SOCKET_URL, {
  // Use transports that align with our backend CORS config
  transports: ["websocket", "polling"],
});

// Basic listeners to verify the handshake in the browser console
socket.on("connect", () => {
  console.log(`✅ Connected to WebSocket backend! (ID: ${socket.id})`);
});

socket.on("disconnect", (reason) => {
  console.log(`❌ Disconnected from WebSocket backend. Reason: ${reason}`);
});

export default socket;
