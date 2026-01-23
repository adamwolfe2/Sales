/**
 * VendingPreneurs API Server
 * Handles content management and real-time sync to clients
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';

import { config } from './config.js';
import { db } from './db/connection.js';
import authRoutes from './routes/auth.js';
import contentRoutes from './routes/content.js';
import adminRoutes from './routes/admin.js';

const app = express();
const server = createServer(app);

// Socket.io for real-time updates
const io = new Server(server, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));
app.use(express.json());

// Make io available to routes
app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);

// Socket.io authentication and connection handling
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    socket.userId = decoded.userId;
    socket.teamId = decoded.teamId;
    socket.role = decoded.role;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Connected clients tracking (for 10-15 users, in-memory is fine)
const connectedClients = new Map();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.userId} (Team: ${socket.teamId})`);

  // Track connection
  connectedClients.set(socket.userId, {
    socketId: socket.id,
    teamId: socket.teamId,
    connectedAt: new Date()
  });

  // Join team room for targeted broadcasts
  socket.join(`team:${socket.teamId}`);

  // Handle content sync request (on connect or reconnect)
  socket.on('sync:request', async (data) => {
    try {
      const { lastSync } = data || {};
      const content = await getTeamContent(socket.teamId, lastSync);
      socket.emit('sync:response', content);
    } catch (err) {
      console.error('Sync error:', err);
      socket.emit('sync:error', { message: 'Failed to sync content' });
    }
  });

  // Ping/pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.userId}`);
    connectedClients.delete(socket.userId);
  });
});

// Helper to get team content
async function getTeamContent(teamId, since = null) {
  const result = {
    objections: [],
    playbooks: [],
    testimonials: [],
    patterns: [],
    syncedAt: new Date().toISOString()
  };

  try {
    // Get objections
    const objectionsQuery = since
      ? `SELECT * FROM objections WHERE team_id = $1 AND updated_at > $2 ORDER BY rank`
      : `SELECT * FROM objections WHERE team_id = $1 ORDER BY rank`;
    const objections = since
      ? await db.query(objectionsQuery, [teamId, since])
      : await db.query(objectionsQuery, [teamId]);
    result.objections = objections.rows;

    // Get playbooks
    const playbooksQuery = since
      ? `SELECT * FROM playbooks WHERE team_id = $1 AND updated_at > $2`
      : `SELECT * FROM playbooks WHERE team_id = $1`;
    const playbooks = since
      ? await db.query(playbooksQuery, [teamId, since])
      : await db.query(playbooksQuery, [teamId]);
    result.playbooks = playbooks.rows;

    // Get testimonials
    const testimonialsQuery = since
      ? `SELECT * FROM testimonials WHERE team_id = $1 AND updated_at > $2`
      : `SELECT * FROM testimonials WHERE team_id = $1`;
    const testimonials = since
      ? await db.query(testimonialsQuery, [teamId, since])
      : await db.query(testimonialsQuery, [teamId]);
    result.testimonials = testimonials.rows;

    // Get patterns
    const patternsQuery = since
      ? `SELECT * FROM patterns WHERE team_id = $1 AND updated_at > $2`
      : `SELECT * FROM patterns WHERE team_id = $1`;
    const patterns = since
      ? await db.query(patternsQuery, [teamId, since])
      : await db.query(patternsQuery, [teamId]);
    result.patterns = patterns.rows;

  } catch (err) {
    console.error('Error fetching team content:', err);
  }

  return result;
}

// Export for use in routes (to broadcast updates)
export function broadcastToTeam(teamId, event, data) {
  io.to(`team:${teamId}`).emit(event, data);
}

export function getConnectedClients() {
  return Array.from(connectedClients.entries()).map(([userId, info]) => ({
    userId,
    ...info
  }));
}

// Start server
server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`WebSocket server ready`);
});

export { io, app, server };
