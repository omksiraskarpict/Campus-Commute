import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import User from '../models/User.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

import {
  findOrCreateSocialLoginUser,
  verifyGoogleIdentity,
  verifyMicrosoftIdentity
} from '../services/socialAuthService.js';

const router = Router();

/* =========================================================
   VALIDATION SCHEMAS
   ========================================================= */

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100)
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(100)
});

const socialLoginSchema = z.object({
  credential: z.string().trim().min(20),
  name: z.string().trim().max(80).optional()
});

/* =========================================================
   JWT
   ========================================================= */

const tokenFor = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role
    },
    env.jwtSecret,
    {
      expiresIn: '7d'
    }
  );
};

/* =========================================================
   REGISTER
   ========================================================= */

router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const email = data.email.toLowerCase().trim();

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with that email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await User.create({
      name: data.name || email.split('@')[0],
      email,
      password: hashedPassword,
      authProvider: 'LOCAL',
      role: 'STUDENT',
      verificationStatus: 'PENDING',
      accountStatus: 'ACTIVE'
    });

    return res.status(201).json({
      token: tokenFor(user),
      user
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   LOGIN
   ========================================================= */

router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const email = data.email.toLowerCase().trim();

    const user = await User.findOne({ email })
      .select('+password');

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(data.password, user.password))
    ) {
      return res.status(401).json({
        message: 'Email or password is incorrect.'
      });
    }

    if (user.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        message:
          'This account is suspended. Contact an administrator.'
      });
    }

    return res.json({
      token: tokenFor(user),
      user
    });
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   GOOGLE LOGIN
   ========================================================= */

router.post('/google', async (req, res, next) => {
  try {
    const data = socialLoginSchema.parse(req.body);

    /*
     * IMPORTANT:
     * Do NOT use req.body.email for authentication.
     *
     * Google must be the source of the authenticated email.
     */
    const verified = await verifyGoogleIdentity(data.credential);

    if (!verified?.sub) {
      return res.status(401).json({
        message: 'Google account could not be verified.'
      });
    }

    if (!verified?.email) {
      return res.status(401).json({
        message: 'Google account email could not be verified.'
      });
    }

    const googleEmail = verified.email.toLowerCase().trim();

    /*
     * Google normally supplies "email_verified".
     * Never create an account from an unverified email.
     */
    if (verified.email_verified !== true) {
      return res.status(401).json({
        message:
          'Your Google email address has not been verified by Google.'
      });
    }

    const user = await findOrCreateSocialLoginUser({
      provider: 'GOOGLE',
      providerId: verified.sub,
      email: googleEmail,
      name:
        verified.name ||
        data.name ||
        googleEmail.split('@')[0]
    });

    if (!user) {
      return res.status(500).json({
        message: 'Unable to create or retrieve your account.'
      });
    }

    if (user.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        message:
          'This account is suspended. Contact an administrator.'
      });
    }

    return res.json({
      token: tokenFor(user),
      user
    });
  } catch (error) {
    console.error('[Google Login Error]', error);

    if (
      error?.message ===
      'Missing Google OAuth configuration.'
    ) {
      return res.status(503).json({
        message:
          'Google sign-in is not configured on the server.'
      });
    }

    if (
      error?.message ===
      'Google sign-in failed.'
    ) {
      return res.status(401).json({
        message:
          'Google sign-in failed. Please try again.'
      });
    }

    if (
      error?.message ===
      'Only college email addresses are allowed for Campus Commute accounts.'
    ) {
      return res.status(403).json({
        message:
          'Only approved college email addresses are allowed for Campus Commute accounts.'
      });
    }

    next(error);
  }
});

/* =========================================================
   MICROSOFT LOGIN
   ========================================================= */

router.post('/microsoft', async (req, res, next) => {
  try {
    const data = socialLoginSchema.parse(req.body);

    const verified = await verifyMicrosoftIdentity(
      data.credential
    );

    if (!verified?.oid && !verified?.sub) {
      return res.status(401).json({
        message:
          'Microsoft account could not be verified.'
      });
    }

    /*
     * Microsoft can provide email through different claims.
     * Prefer email, then preferred_username.
     */
    const microsoftEmail = (
      verified.email ||
      verified.preferred_username ||
      ''
    )
      .toLowerCase()
      .trim();

    if (!microsoftEmail) {
      return res.status(401).json({
        message:
          'Microsoft account email could not be verified.'
      });
    }

    const microsoftProviderId =
      verified.oid || verified.sub;

    const user = await findOrCreateSocialLoginUser({
      provider: 'MICROSOFT',
      providerId: microsoftProviderId,
      email: microsoftEmail,
      name:
        verified.name ||
        data.name ||
        microsoftEmail.split('@')[0]
    });

    if (!user) {
      return res.status(500).json({
        message:
          'Unable to create or retrieve your account.'
      });
    }

    if (user.accountStatus === 'SUSPENDED') {
      return res.status(403).json({
        message:
          'This account is suspended. Contact an administrator.'
      });
    }

    return res.json({
      token: tokenFor(user),
      user
    });
  } catch (error) {
    console.error('[Microsoft Login Error]', error);

    if (
      error?.message ===
      'Missing Microsoft OAuth configuration.'
    ) {
      return res.status(503).json({
        message:
          'Microsoft sign-in is not configured on the server.'
      });
    }

    if (
      error?.message ===
      'Microsoft sign-in failed.'
    ) {
      return res.status(401).json({
        message:
          'Microsoft sign-in failed. Please try again.'
      });
    }

    if (
      error?.message ===
      'Only college email addresses are allowed for Campus Commute accounts.'
    ) {
      return res.status(403).json({
        message:
          'Only approved college email addresses are allowed for Campus Commute accounts.'
      });
    }

    next(error);
  }
});

/* =========================================================
   CURRENT USER
   ========================================================= */

router.get('/me', requireAuth, (req, res) => {
  return res.json({
    user: req.user
  });
});

export default router;