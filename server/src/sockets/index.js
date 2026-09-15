import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import JoinRequest from '../models/JoinRequest.js';
import Message from '../models/Message.js';
import Ride from '../models/Ride.js';
import { env } from '../config/env.js';

export function registerSockets(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, env.jwtSecret);
      socket.user = await User.findById(payload.userId).select('name role accountStatus preferences');
      if (!socket.user || socket.user.accountStatus === 'SUSPENDED') throw new Error('Unauthorized');
      next();
    } catch { next(new Error('Unauthorized socket connection')); }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.user._id}`);
    socket.on('joinRideRoom', async (rideId) => {
      try { if (await canAccess(rideId)) socket.join(`ride:${rideId}`); } catch { socket.emit('socket_error', { message: 'Chat room unavailable.' }); }
    });
    socket.on('leaveRideRoom', (rideId) => socket.leave(`ride:${rideId}`));
    const canAccess = async (rideId) => Boolean(await JoinRequest.exists({ ride: rideId, user: socket.user._id, status: 'ACCEPTED' }) || await Ride.exists({ _id: rideId, creator: socket.user._id }));
    socket.on('sendMessage', async ({ rideId, message }) => {
      try {
      if (!message?.trim()) return;
      if (!await canAccess(rideId)) return;
      const saved = await Message.create({ ride: rideId, sender: socket.user._id, message: message.trim() });
      io.to(`ride:${rideId}`).emit('receiveMessage', { message: await saved.populate('sender', 'name') });
      } catch (error) { socket.emit('socket_error', { message: 'Message could not be sent.' }); }
    });
    socket.on('typing', async (rideId) => { if (await canAccess(rideId)) socket.to(`ride:${rideId}`).emit('typing', { userId: socket.user._id, name: socket.user.name }); });
    socket.on('stopTyping', async (rideId) => { if (await canAccess(rideId)) socket.to(`ride:${rideId}`).emit('stopTyping', { userId: socket.user._id }); });
    socket.on('disconnect', () => io.to(`user:${socket.user._id}`).emit('user_offline', { userId: socket.user._id }));
  });
}
