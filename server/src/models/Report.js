import mongoose from 'mongoose';
const schema = new mongoose.Schema({ reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' }, reason: { type: String, required: true }, description: { type: String, maxlength: 2000 }, status: { type: String, enum: ['OPEN', 'REVIEWING', 'RESOLVED'], default: 'OPEN', index: true }, adminNotes: String }, { timestamps: true });
export default mongoose.model('Report', schema);
