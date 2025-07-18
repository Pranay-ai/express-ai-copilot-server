// server.js
const express = require('express');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Import services
const { getSessionService } = require('./singleton.service');

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: false,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  perMessageDeflate: false,
  httpCompression: false,
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  upgradeTimeout: 10000,
});

// Initialize session service
let sessionService;
try {
  sessionService = getSessionService();
  console.log("✅ Session service initialized");
} catch (error) {
  console.error("❌ Failed to initialize session service:", error);
  process.exit(1);
}

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Create session event
  socket.on("create-session", async (data) => {
    try {
      console.log("Creating session with schema:", data.schema);
      const sessionId = sessionService.createSession(data.schema);
      const initialMessage = sessionService.aiService.getInitialMessage();

      socket.emit("session-created", { 
        sessionId, 
        initialMessage: initialMessage.ai_message,
        formData: initialMessage.form_data || {}
      });
      console.log(`✅ Session created: ${sessionId}`);
    } catch (error) {
      console.error("❌ Session creation error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  // Send message event
  socket.on("send-message", async (data) => {
    try {
      console.log(`📨 Message from ${data.sessionId}: ${data.message}`);

      socket.emit("typing", true);
      const response = await sessionService.sendMessage(
        data.sessionId,
        data.message
      );
      socket.emit("typing", false);

      // Handle structured response
      const aiMessage = typeof response === 'string' ? response : response.ai_message;
      const formData = typeof response === 'object' ? response.form_data : {};

      socket.emit("message-response", { 
        response: aiMessage,
        formData: formData || {}
      });
      
      console.log(`🤖 AI Response: ${aiMessage}`);
      if (Object.keys(formData || {}).length > 0) {
        console.log(`📝 Form Data: ${JSON.stringify(formData)}`);
      }
    } catch (error) {
      console.error("❌ Message processing error:", error);
      socket.emit("typing", false);
      socket.emit("error", { message: error.message });
    }
  });

  // End session event
  socket.on("end-session", (data) => {
    try {
      const deleted = sessionService.deleteSession(data.sessionId);
      if (deleted) {
        socket.emit("session-ended");
        console.log(`🔚 Session ended: ${data.sessionId}`);
      } else {
        socket.emit("error", { message: "Session not found" });
      }
    } catch (error) {
      console.error("❌ Session end error:", error);
      socket.emit("error", { message: error.message });
    }
  });

  // Handle socket errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });

  // Disconnect event
  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Handle server errors
io.on("error", (error) => {
  console.error("Socket.IO server error:", error);
});

// REST API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'WebSocket server is running',
    timestamp: new Date().toISOString(),
    sessions: sessionService.getSessionCount()
  });
});

app.get('/api/socket/status', (req, res) => {
  res.json({
    message: "WebSocket server is running",
    status: "ready",
    activeSessions: sessionService.getSessionCount()
  });
});

// Health check for AI service
app.get('/api/health/ai', async (req, res) => {
  try {
    const isHealthy = await sessionService.aiService.healthCheck();
    res.json({
      status: isHealthy ? 'OK' : 'ERROR',
      service: 'AI Service',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      service: 'AI Service',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Express server with Socket.IO running on port ${PORT}`);
  console.log(`🎯 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});