import mongoose from 'mongoose';
import User from '../models/User.js';
import { env } from '../config/env.js';

const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error('Usage: npm run promote-admin -- student@college.edu');
  process.exit(1);
}

try {
  await mongoose.connect(env.mongoUri);
  const user = await User.findOneAndUpdate({ email }, { role: 'ADMIN', verificationStatus: 'VERIFIED' }, { new: true });
  if (!user) throw new Error(`No user found for ${email}`);
  console.log(`${user.email} is now an ADMIN.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}