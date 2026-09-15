import { Router } from 'express';
import { z } from 'zod';
import JoinRequest from '../models/JoinRequest.js';
import Ride from '../models/Ride.js';
import Message from '../models/Message.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.get('/:rideId', requireAuth, async (req, res, next) => { try { const allowed = await JoinRequest.exists({ ride: req.params.rideId, user: req.user._id, status: 'ACCEPTED' }) || await Ride.exists({ _id: req.params.rideId, creator: req.user._id }); if (!allowed) return res.status(403).json({ message: 'Join the ride to access this chat.' }); const messages = await Message.find({ ride: req.params.rideId }).populate('sender', 'name').sort({ createdAt: 1 }).limit(100).lean(); res.json({ messages }); } catch (e) { next(e); } });
export default router;
