import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import ChatbotConversation from '../models/ChatbotConversation.js';
import JoinRequest from '../models/JoinRequest.js';
import Notification from '../models/Notification.js';
import Ride from '../models/Ride.js';

const router = Router();
const limit = rateLimit({ windowMs: 60 * 1000, limit: 20, message: { message: 'Please wait before sending more assistant messages.' } });
const input = z.object({ message: z.string().trim().min(1).max(1000) });

function answer(message, context) {
  const text = message.toLowerCase();
  if (/phone|number|contact.*student|private/.test(text)) return 'I cannot share another student\'s private contact information. Please use an authorized ride conversation instead.';
  if (/book|join|find.*ride|ride.*find/.test(text)) return 'Open Find a ride, choose a suitable ride, and select the seats button. Your request will be sent to the ride owner.';
  if (/offer|create|post.*ride/.test(text)) return 'Choose Offer a ride from Home, enter your route, date, time, seats, and vehicle details, then submit the form.';
  if (/cancel/.test(text)) return 'Open My trips, select the ride you created, and use its available ride action to cancel it. Contact support if the ride has already started.';
  if (/trip|joined/.test(text)) return `You currently have ${context.joined} joined trip${context.joined === 1 ? '' : 's'} and ${context.created} offered ride${context.created === 1 ? '' : 's'}.`;
  if (/message|chat/.test(text)) return 'Open Messages from the sidebar. Ride conversations are available to accepted participants and the ride owner.';
  if (/notification/.test(text)) return `You have ${context.unread} unread notification${context.unread === 1 ? '' : 's'}. Open Notifications to review them.`;
  if (/profile|account/.test(text)) return 'Open Profile to update your name, phone, college, department, year, and avatar. Role and verification are managed by the platform.';
  if (/setting|password|privacy/.test(text)) return 'Open Settings to manage notification preferences, privacy visibility, and account security.';
  if (/verify|verification|admin|support/.test(text)) return 'Verification and account support are handled by Campus Commute administrators. Contact support from your college help channel.';
  return 'I am not sure about that. I can help with finding rides, offering rides, trips, messages, notifications, profile, and settings.';
}

router.get('/conversation', requireAuth, async (req, res, next) => { try { const conversation = await ChatbotConversation.findOne({ user: req.user._id }).lean(); res.json({ messages: conversation?.messages || [] }); } catch (error) { next(error); } });
router.post('/message', requireAuth, limit, async (req, res, next) => {
  try {
    const { message } = input.parse(req.body);
    const [joined, created, unread] = await Promise.all([JoinRequest.countDocuments({ user: req.user._id, status: 'ACCEPTED' }), Ride.countDocuments({ creator: req.user._id }), Notification.countDocuments({ user: req.user._id, read: false })]);
    const reply = answer(message, { joined, created, unread });
    const conversation = await ChatbotConversation.findOneAndUpdate({ user: req.user._id }, { $push: { messages: { $each: [{ role: 'user', content: message }, { role: 'assistant', content: reply }], $slice: -40 } } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json({ reply, messages: conversation.messages.slice(-2) });
  } catch (error) { next(error); }
});
export default router;
