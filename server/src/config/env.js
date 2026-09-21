import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

/*
 * .env location:
 *
 * D:\Project\Campus Commute\.env
 *
 * This file is located at:
 *
 * D:\Project\Campus Commute\server\src\config\env.js
 */
dotenv.config({
  path: resolve(currentDirectory, '../../.env')
});

/**
 * Convert a comma-separated environment variable
 * into a clean lowercase array.
 *
 * Example:
 *
 * COLLEGE_EMAIL_DOMAINS=pict.edu,pict.ac.in
 *
 * becomes:
 *
 * ['pict.edu', 'pict.ac.in']
 */
const parseList = (value) => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

/**
 * Parse an integer environment variable safely.
 */
const parseNumber = (value, fallback) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

/**
 * Application environment configuration.
 */
export const env = {
  // =========================================================
  // SERVER
  // =========================================================

  port: parseNumber(
    process.env.PORT,
    5000
  ),

  // =========================================================
  // DATABASE
  // =========================================================

  mongoUri:
    process.env.MONGO_URI?.trim() ||
    'mongodb://127.0.0.1:27017/campus-commute',

  mongoSelectionTimeoutMs: parseNumber(
    process.env.MONGO_SELECTION_TIMEOUT_MS,
    5000
  ),

  // =========================================================
  // JWT AUTHENTICATION
  // =========================================================

  jwtSecret:
    process.env.JWT_SECRET?.trim() ||
    'development-only-secret',

  // =========================================================
  // FRONTEND
  // =========================================================

  clientUrl:
    process.env.CLIENT_URL?.trim() ||
    'http://localhost:5173',

  clientUrls: parseList(
    process.env.CLIENT_URL ||
      'http://localhost:5173'
  ),

  // =========================================================
  // GOOGLE AUTHENTICATION
  // =========================================================

  googleClientId:
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.VITE_GOOGLE_CLIENT_ID?.trim() ||
    '',

  // =========================================================
  // MICROSOFT AUTHENTICATION
  // =========================================================

  microsoftClientId:
    process.env.MICROSOFT_CLIENT_ID?.trim() ||
    process.env.VITE_MICROSOFT_CLIENT_ID?.trim() ||
    '',

  microsoftTenantId:
    process.env.MICROSOFT_TENANT_ID?.trim() ||
    'common',

  // =========================================================
  // COLLEGE EMAIL RESTRICTION
  // =========================================================
  //
  // Configure this in:
  //
  // D:\Project\Campus Commute\.env
  //
  // Example:
  //
  // COLLEGE_EMAIL_DOMAINS=pict.edu
  //
  // Multiple colleges:
  //
  // COLLEGE_EMAIL_DOMAINS=pict.edu,pict.ac.in,vit.edu
  //
  // The authentication service will compare the email
  // domain against this list.
  // =========================================================

  collegeEmailDomains: parseList(
    process.env.COLLEGE_EMAIL_DOMAINS ||
      'pict.edu'
  )
};