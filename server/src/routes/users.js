import { Router } from 'express';
import { z } from 'zod';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
router.patch('/me', requireAuth, async (req, res, next) => { try { const data = z.object({ name: z.string().min(2).max(80).optional(), phone: z.string().max(30).optional(), college: z.string().max(120).optional(), department: z.string().max(120).optional(), year: z.string().max(20).optional() }).parse(req.body); const user = await User.findByIdAndUpdate(req.user._id, data, { new: true, runValidators: true }); res.json({ user }); } catch (e) { next(e); } });
router.patch('/me/preferences', requireAuth, async (req, res, next) => { try { const preferences = z.object({ rideNotifications: z.boolean().optional(), messageNotifications: z.boolean().optional(), systemNotifications: z.boolean().optional(), profileVisible: z.boolean().optional(), onlineStatusVisible: z.boolean().optional() }).parse(req.body); const user = await User.findByIdAndUpdate(req.user._id, { $set: Object.fromEntries(Object.entries(preferences).map(([key, value]) => [`preferences.${key}`, value])) }, { new: true, runValidators: true }); res.json({ user }); } catch (e) { next(e); } });
export default router;
