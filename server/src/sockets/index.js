import { Server } from 'socket.io';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let io = null;

export function initializeSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info('Client connected', { socketId: socket.id });

    socket.on('disconnect', () => {
      logger.info('Client disconnected', { socketId: socket.id });
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitActivity(eventName, data) {
  if (io) {
    io.emit(eventName, { ...data, timestamp: data.timestamp || new Date() });
  }
}
