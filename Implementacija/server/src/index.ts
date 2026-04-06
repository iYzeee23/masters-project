import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './routes/auth';
import mapRoutes from './routes/maps';
import runRoutes from './routes/runs';
import playgroundRoutes from './routes/playground';
import uploadRoutes from './routes/upload';
import aiRoutes from './routes/ai';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

export { app, io };
