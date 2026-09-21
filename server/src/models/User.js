import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, default: null, select: false },
  phone: String,
  role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT', index: true },
  authProvider: { type: String, enum: ['LOCAL', 'GOOGLE', 'MICROSOFT'], default: 'LOCAL', index: true },
  providerId: { type: String, default: null, index: true },
  college: String,
  department: String,
  year: String,
  profileImage: String,
  verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
  accountStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },
  preferences: {
    rideNotifications: { type: Boolean, default: true },
    messageNotifications: { type: Boolean, default: true },
    systemNotifications: { type: Boolean, default: true },
    profileVisible: { type: Boolean, default: true },
    onlineStatusVisible: { type: Boolean, default: true }
  },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  completedRides: { type: Number, default: 0 },
  responseRate: { type: Number, default: 100, min: 0, max: 100 }
}, { timestamps: true });

userSchema.index({ authProvider: 1, providerId: 1 }, { unique: true, sparse: true });
userSchema.set('toJSON', { transform: (_doc, value) => { delete value.password; return value; } });
export default mongoose.model('User', userSchema);
