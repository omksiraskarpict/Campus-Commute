import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Ride from '../models/Ride.js';
import Report from '../models/Report.js';
import AuditLog from '../models/AuditLog.js';
import JoinRequest from '../models/JoinRequest.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';
import { getAdminAnalytics } from '../services/adminAnalyticsService.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth, requireAdmin);
router.get('/analytics', async (req, res, next) => {
	try {
		res.json(await getAdminAnalytics(String(req.query.range || '7d')));
	} catch (error) {
		next(error);
	}
});
router.get('/overview', async (_req, res, next) => { try { const [users, verified, pending, active, completed, cancelled] = await Promise.all([User.countDocuments(), User.countDocuments({ verificationStatus: 'VERIFIED' }), User.countDocuments({ verificationStatus: 'PENDING' }), Ride.countDocuments({ status: { $in: ['ACTIVE', 'FULL'] } }), Ride.countDocuments({ status: 'COMPLETED' }), Ride.countDocuments({ status: 'CANCELLED' })]); res.json({ metrics: { users, verified, pending, active, completed, cancelled } }); } catch (e) { next(e); } });
router.get('/stats', async (_req, res, next) => { try { const overview = await router.handle?._router ? null : null; const [users, verified, pending, active, completed, cancelled] = await Promise.all([User.countDocuments(), User.countDocuments({ verificationStatus: 'VERIFIED' }), User.countDocuments({ verificationStatus: 'PENDING' }), Ride.countDocuments({ status: { $in: ['ACTIVE', 'FULL'] } }), Ride.countDocuments({ status: 'COMPLETED' }), Ride.countDocuments({ status: 'CANCELLED' })]); res.json({ metrics: { users, verified, pending, active, completed, cancelled } }); } catch (e) { next(e); } });
router.get('/users', async (req, res, next) => { try { const page = Math.max(1, Number(req.query.page || 1)); const users = await User.find().select('-password').sort({ createdAt: -1 }).skip((page - 1) * 25).limit(25).lean(); res.json({ users, page }); } catch (e) { next(e); } });
router.get('/bookings', async (_req, res, next) => { try { const bookings = await JoinRequest.find().populate('user', 'name email').populate({ path: 'ride', select: 'source destination date status creator', populate: { path: 'creator', select: 'name email' } }).sort({ createdAt: -1 }).limit(100).lean(); res.json({ bookings }); } catch (error) { next(error); } });
router.get('/messages', async (_req, res, next) => {
	try {
		const messages = await Message.find()
			.populate('sender', 'name role')
			.populate({ path: 'ride', populate: { path: 'creator', select: 'name role' } })
			.sort({ createdAt: 1 })
			.limit(500)
			.lean();
		const rideIds = [...new Set(messages.map((item) => String(item.ride?._id || item.ride)).filter(Boolean))];
		const requests = await JoinRequest.find({ ride: { $in: rideIds }, status: 'ACCEPTED' }).populate('user', 'name role').lean();
		const participantsByRide = requests.reduce((groups, request) => {
			const key = String(request.ride);
			(groups[key] ||= []).push(request.user);
			return groups;
		}, {});
		const enriched = messages.map((item) => {
			const ride = item.ride;
			const participants = [ride?.creator, ...(participantsByRide[String(ride?._id)] || [])].filter(Boolean);
			const recipients = participants.filter((person) => String(person._id) !== String(item.sender?._id));
			return { ...item, recipients, rideParticipants: participants };
		});
		const conversations = Object.values(enriched.reduce((groups, item) => {
			const key = String(item.ride?._id || 'unknown');
			(groups[key] ||= { ride: item.ride, participants: item.rideParticipants, messages: [] }).messages.push(item);
			return groups;
		}, {}));
		res.json({ messages: enriched, conversations });
	} catch (error) { next(error); }
});
router.get('/notifications', async (_req, res, next) => {
	try {
		const notifications = await Notification.find()
			.populate('user', 'name role email')
			.populate({ path: 'relatedRide', populate: { path: 'creator', select: 'name role' } })
			.populate({ path: 'relatedRequest', populate: [{ path: 'user', select: 'name role' }, { path: 'ride', select: 'source destination date departureTime status creator' }] })
			.sort({ createdAt: -1 }).limit(100).lean();
		res.json({ notifications });
	} catch (error) { next(error); }
});

const studentFields = '-password -__v';
const validId = (id) => mongoose.Types.ObjectId.isValid(id);

router.get('/students', async (req, res, next) => {
	try {
		const page = Math.max(1, Number(req.query.page || 1));
		const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
		const query = String(req.query.search || '').trim();
		const filter = query ? { $or: [{ name: { $regex: query, $options: 'i' } }, { email: { $regex: query, $options: 'i' } }] } : {};
		const [students, total] = await Promise.all([
			User.find(filter).select(studentFields).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
			User.countDocuments(filter)
		]);
		res.json({ students, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
	} catch (error) { next(error); }
});

router.get('/students/:id', async (req, res, next) => {
	try {
		if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid student ID.' });
		const student = await User.findById(req.params.id).select(studentFields).lean();
		if (!student) return res.status(404).json({ message: 'Student not found.' });
		res.json({ student });
	} catch (error) { next(error); }
});

router.patch('/students/:id/verify', async (req, res, next) => {
	try {
		if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid student ID.' });
		const student = await User.findByIdAndUpdate(req.params.id, { verificationStatus: 'VERIFIED' }, { new: true, runValidators: true }).select(studentFields).lean();
		if (!student) return res.status(404).json({ message: 'Student not found.' });
		await AuditLog.create({ admin: req.user._id, action: 'VERIFY_USER', target: req.params.id });
		res.json({ student, message: 'Student verified successfully.' });
	} catch (error) { next(error); }
});

router.patch('/students/:id/status', async (req, res, next) => {
	try {
		if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid student ID.' });
		if (!['ACTIVE', 'SUSPENDED'].includes(req.body?.accountStatus)) return res.status(400).json({ message: 'Account status must be ACTIVE or SUSPENDED.' });
		if (String(req.user._id) === req.params.id) return res.status(409).json({ message: 'You cannot change your own account status.' });
		const student = await User.findByIdAndUpdate(req.params.id, { accountStatus: req.body.accountStatus }, { new: true, runValidators: true }).select(studentFields).lean();
		if (!student) return res.status(404).json({ message: 'Student not found.' });
		await AuditLog.create({ admin: req.user._id, action: `USER_${req.body.accountStatus}`, target: req.params.id });
		res.json({ student, message: `Student ${student.accountStatus === 'ACTIVE' ? 'activated' : 'suspended'} successfully.` });
	} catch (error) { next(error); }
});
router.get('/rides', async (req, res, next) => { try { const status = String(req.query.status || ''); const search = String(req.query.search || '').trim(); const filter = {}; if (['ACTIVE', 'FULL', 'CANCELLED', 'COMPLETED', 'EXPIRED'].includes(status)) filter.status = status; if (search) filter.$or = [{ source: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { destination: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }]; const rides = await Ride.find(filter).populate('creator', 'name email').sort({ createdAt: -1 }).limit(100).lean(); res.json({ rides }); } catch (error) { next(error); } });
router.get('/routes', async (_req, res, next) => {
	try {
		const rides = await Ride.find().populate('creator', 'name role').sort({ date: 1, departureTime: 1 }).limit(500).lean();
		const requests = await JoinRequest.find({ ride: { $in: rides.map((ride) => ride._id) } }).populate('user', 'name role').sort({ createdAt: 1 }).lean();
		const requestsByRide = requests.reduce((groups, request) => {
			(groups[String(request.ride)] ||= []).push(request);
			return groups;
		}, {});
		const routes = Object.values(rides.reduce((groups, ride) => {
			const key = `${ride.source}\u0000${ride.destination}`;
			(groups[key] ||= { source: ride.source, destination: ride.destination, rides: [] }).rides.push({ ...ride, requests: requestsByRide[String(ride._id)] || [] });
			return groups;
		}, {})).map((route) => ({ ...route, rideCount: route.rides.length, acceptedPassengers: route.rides.reduce((total, ride) => total + ride.requests.filter((item) => item.status === 'ACCEPTED').length, 0) }));
		res.json({ routes });
	} catch (error) { next(error); }
});
router.patch('/rides/:id/cancel', async (req, res, next) => { try { if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ride ID.' }); const ride = await Ride.findByIdAndUpdate(req.params.id, { status: 'CANCELLED' }, { new: true }); if (!ride) return res.status(404).json({ message: 'Ride not found.' }); await AuditLog.create({ admin: req.user._id, action: 'CANCEL_RIDE', target: req.params.id }); res.json({ ride }); } catch (error) { next(error); } });
router.patch('/rides/:id/complete', async (req, res, next) => { try { if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid ride ID.' }); const ride = await Ride.findById(req.params.id); if (!ride) return res.status(404).json({ message: 'Ride not found.' }); if (ride.status === 'COMPLETED') return res.status(409).json({ message: 'Ride is already completed.' }); if (ride.status === 'CANCELLED') return res.status(409).json({ message: 'Cancelled rides cannot be completed.' }); if (ride.status !== 'ACTIVE') return res.status(400).json({ message: 'Only active rides can be completed.' }); ride.status = 'COMPLETED'; ride.completedAt = new Date(); ride.completionMethod = 'ADMIN'; await ride.save(); await AuditLog.create({ admin: req.user._id, action: 'COMPLETE_RIDE', target: req.params.id, metadata: { completionMethod: 'ADMIN' } }); res.json({ message: 'Ride completed successfully.', ride }); } catch (error) { next(error); } });
router.get('/reports', async (_req, res, next) => { try { const reports = await Report.find().populate('reporter', 'name email').populate('reportedUser', 'name email').populate('ride', 'source destination').sort({ createdAt: -1 }).limit(100).lean(); res.json({ reports }); } catch (error) { next(error); } });
router.patch('/reports/:id', async (req, res, next) => { try { if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid report ID.' }); if (!['OPEN', 'REVIEWING', 'RESOLVED'].includes(req.body?.status)) return res.status(400).json({ message: 'Invalid report status.' }); const report = await Report.findByIdAndUpdate(req.params.id, { status: req.body.status, adminNotes: String(req.body.adminNotes || '').slice(0, 1000) }, { new: true, runValidators: true }); if (!report) return res.status(404).json({ message: 'Report not found.' }); await AuditLog.create({ admin: req.user._id, action: 'UPDATE_REPORT', target: req.params.id, metadata: { status: req.body.status } }); res.json({ report }); } catch (error) { next(error); } });
router.get('/audit-logs', async (_req, res, next) => { try { const logs = await AuditLog.find().populate('admin', 'name email').sort({ createdAt: -1 }).limit(100).lean(); res.json({ logs }); } catch (error) { next(error); } });
export default router;
