import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import rideRoutes from './routes/rides.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';
import messageRoutes from './routes/messages.js';
import userRoutes from './routes/users.js';
import chatbotRoutes from './routes/chatbot.js';

import { env } from './config/env.js';

export function createApp() {
  const app = express();

  // Trust proxy when deployed behind services such as Render
  app.set('trust proxy', 1);

  // --------------------------------------------------
  // Security
  // --------------------------------------------------
  app.use(helmet());

  // --------------------------------------------------
  // CORS
  // --------------------------------------------------
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://campus-commute.vercel.app',
    ...(Array.isArray(env.clientUrls) ? env.clientUrls : [])
  ];

  // Remove duplicate origins
  const uniqueOrigins = [...new Set(allowedOrigins)];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests that don't contain an Origin header
        // (Postman, server-to-server requests, etc.)
        if (!origin) {
          return callback(null, true);
        }

        if (uniqueOrigins.includes(origin)) {
          return callback(null, true);
        }

        console.error(`CORS blocked origin: ${origin}`);

        return callback(
          new Error(`CORS origin not allowed: ${origin}`)
        );
      },

      credentials: true,

      methods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS'
      ],

      allowedHeaders: [
        'Content-Type',
        'Authorization'
      ]
    })
  );

  // --------------------------------------------------
  // Body parser
  // --------------------------------------------------
  app.use(express.json({ limit: '1mb' }));

  // --------------------------------------------------
  // Rate limiting
  // --------------------------------------------------
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 500,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  // --------------------------------------------------
  // Health check
  // --------------------------------------------------
  app.get('/api/health', (_req, res) => {
    const databaseReady = mongoose.connection.readyState === 1;

    res.status(databaseReady ? 200 : 503).json({
      ok: databaseReady,
      service: 'campus-commute-api',
      database: databaseReady
        ? 'connected'
        : 'unavailable'
    });
  });

  // --------------------------------------------------
  // API Routes
  // --------------------------------------------------
  app.use('/api/auth', authRoutes);
  app.use('/api/rides', rideRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chatbot', chatbotRoutes);
  app.use('/api/admin', adminRoutes);

  // --------------------------------------------------
  // 404 Handler
  // --------------------------------------------------
  app.use((req, res) => {
    res.status(404).json({
      message: `Route not found: ${req.method} ${req.originalUrl}`
    });
  });

  // --------------------------------------------------
  // Global Error Handler
  // --------------------------------------------------
  app.use((error, req, res, _next) => {
    console.error('\n========== SERVER ERROR ==========');
    console.error('Method:', req.method);
    console.error('URL:', req.originalUrl);
    console.error('Message:', error?.message);
    console.error('Name:', error?.name);

    if (error?.stack) {
      console.error('Stack:', error.stack);
    }

    console.error('==================================\n');

    const databaseReady =
      mongoose.connection.readyState === 1;

    // CORS error
    if (
      error?.message &&
      error.message.startsWith('CORS origin not allowed:')
    ) {
      return res.status(403).json({
        message: 'CORS origin not allowed.'
      });
    }

    // Zod validation error
    if (error?.name === 'ZodError') {
      return res.status(400).json({
        message: 'Invalid request data.',
        errors: error.errors || error.issues || []
      });
    }

    // MongoDB / Mongoose validation errors
    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        message: error.message,
        errors: error.errors
          ? Object.fromEntries(
              Object.entries(error.errors).map(
                ([field, value]) => [
                  field,
                  value.message
                ]
              )
            )
          : undefined
      });
    }

    // Duplicate MongoDB key
    if (error?.code === 11000) {
      return res.status(409).json({
        message: 'A record with this value already exists.',
        fields: error.keyValue || {}
      });
    }

    // JWT / authentication errors
    if (
      error?.name === 'JsonWebTokenError' ||
      error?.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        message: 'Invalid or expired authentication token.'
      });
    }

    // Explicit application status code
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message || 'Request failed.'
      });
    }

    // Database unavailable
    if (!databaseReady) {
      return res.status(503).json({
        message:
          'Database unavailable. Check server/.env MONGO_URI and MongoDB Atlas credentials.'
      });
    }

    // Generic server error
    return res.status(500).json({
      message: 'Something went wrong on the server.'
    });
  });

  return app;
}