import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './routes/auth';
import mapRoutes from './routes/maps';
import runRoutes from './routes/runs';
import playgroundRoutes from './routes/playground';
import uploadRoutes from './routes/upload';
import aiRoutes from './routes/ai';

dotenv.config();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:4200';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: CLIENT_URL },
});

app.use(cors({ origin: CLIENT_URL }));
app.use(helmet());
app.use(express.json({ limit: '2mb' }));

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Make io accessible from route handlers via req.app.locals
app.locals.io = io;

app.use('/api/auth', authRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/playground', playgroundRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);

// Socket.io
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// MongoDB connection + server start
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pathfinder';
const PORT = process.env.PORT || 3000;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    mongoose.connection.close().then(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export { app, io };
