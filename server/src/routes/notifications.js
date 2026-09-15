import { Router } from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.get('/', requireAuth, async (req, res, next) => { try { res.json({ notifications: await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean() }); } catch (e) { next(e); } });
router.patch('/:id/read', requireAuth, async (req, res, next) => { try { const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true }, { new: true }); if (!notification) return res.status(404).json({ message: 'Notification not found.' }); res.json({ notification }); } catch (e) { next(e); } });
router.patch('/read-all', requireAuth, async (req, res, next) => { try { await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } }); res.json({ ok: true }); } catch (e) { next(e); } });
router.delete('/:id', requireAuth, async (req, res, next) => { try { const result = await Notification.deleteOne({ _id: req.params.id, user: req.user._id }); if (!result.deletedCount) return res.status(404).json({ message: 'Notification not found.' }); res.status(204).end(); } catch (e) { next(e); } });
export default router;
