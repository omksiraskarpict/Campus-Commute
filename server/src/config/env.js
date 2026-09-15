import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(currentDirectory, '../../.env') });

export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus-commute',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  mongoSelectionTimeoutMs: Number(process.env.MONGO_SELECTION_TIMEOUT_MS || 5000)
};
