import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import cron from 'node-cron';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { registerSockets } from './sockets/index.js';
import { completeOverdueActiveRides } from './services/rideCompletionService.js';

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.clientUrls, credentials: true }, transports: ['websocket', 'polling'] });
app.set('io', io);
registerSockets(io);

let rideCompletionSchedulerStarted = false;

function startRideCompletionScheduler() {
  if (rideCompletionSchedulerStarted) return;

  rideCompletionSchedulerStarted = true;

  const runCheck = async () => {
    try {
      const result = await completeOverdueActiveRides(new Date());
      if (result.completed > 0) {
        console.log(`[Ride Scheduler] Automatically completed ${result.completed} rides.`);
      }
    } catch (error) {
      console.error('[Ride Scheduler] Automatic ride completion failed.', error.message);
    }
  };

  runCheck();
  cron.schedule('*/30 * * * * *', runCheck);
  console.log('[Ride Scheduler] Active ride completion scheduler started.');
}

server.listen(env.port, () => console.log(`Campus Commute API listening on ${env.port}`));

mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: env.mongoSelectionTimeoutMs })
  .then(() => {
    console.log('MongoDB connected');
    startRideCompletionScheduler();
  })
  .catch((error) => console.error('MongoDB connection failed:', error.message));
