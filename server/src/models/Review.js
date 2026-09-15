import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: String
}, { timestamps: true });
schema.index({ ride: 1, reviewer: 1, reviewedUser: 1 }, { unique: true });
export default mongoose.model('Review', schema);
