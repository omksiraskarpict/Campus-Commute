import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const credentials = z.object({ name: z.string().min(2).max(80).optional(), email: z.string().email(), password: z.string().min(8).max(100) });
const tokenFor = (user) => jwt.sign({ userId: user._id, role: user.role }, env.jwtSecret, { expiresIn: '7d' });

router.post('/register', async (req, res, next) => {
  try {
    const data = credentials.parse(req.body);
    const exists = await User.exists({ email: data.email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with that email already exists.' });
    const user = await User.create({ name: data.name, email: data.email, password: await bcrypt.hash(data.password, 12) });
    res.status(201).json({ token: tokenFor(user), user });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const data = credentials.pick({ email: true, password: true }).parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(data.password, user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
    if (user.accountStatus === 'SUSPENDED') return res.status(403).json({ message: 'This account is suspended. Contact an administrator.' });
    res.json({ token: tokenFor(user), user });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
export default router;
