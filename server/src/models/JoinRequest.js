import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'LEFT'], default: 'PENDING' },
  requestedAt: { type: Date, default: Date.now },
  joinedAt: Date
}, { timestamps: true });
schema.index({ ride: 1, user: 1 }, { unique: true });
export default mongoose.model('JoinRequest', schema);
