import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const email = process.argv[2];

if (!email) {
  console.error('❌ Please provide the admin email.');
  console.error('Example: npm run promote-admin -- admin@example.com');
  process.exit(1);
}

const normalizedEmail = email.trim().toLowerCase();

async function createAdmin() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from server/.env');
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected.');

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      console.error(`❌ No user found with email: ${normalizedEmail}`);
      console.error(
        'Register this user through Campus Commute first, then run the command again.'
      );

      await mongoose.disconnect();
      process.exit(1);
    }

    if (user.role === 'ADMIN') {
      console.log(`ℹ️ ${normalizedEmail} is already an ADMIN.`);
      await mongoose.disconnect();
      process.exit(0);
    }

    user.role = 'ADMIN';

    // Admins should be verified.
    if ('verificationStatus' in user) {
      user.verificationStatus = 'VERIFIED';
    }

    await user.save();

    console.log('======================================');
    console.log('✅ ADMIN CREATED SUCCESSFULLY');
    console.log('======================================');
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name || 'N/A'}`);
    console.log(`Role: ${user.role}`);
    console.log('======================================');
    console.log('The user can now log in normally.');
    console.log('======================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin.');
    console.error('Message:', error.message);

    if (error.stack) {
      console.error(error.stack);
    }

    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

createAdmin();