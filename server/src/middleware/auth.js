import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = await User.findById(payload.userId).select('-password');
    if (!req.user) return res.status(401).json({ message: 'Session user no longer exists.' });
    if (req.user.accountStatus === 'SUSPENDED') return res.status(403).json({ message: 'This account is suspended. Contact an administrator.' });
    next();
  } catch { res.status(401).json({ message: 'Invalid or expired session.' }); }
}

export function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next() : res.status(403).json({ message: 'You do not have access to this resource.' });
}

export const requireAdmin = requireRole('ADMIN');
