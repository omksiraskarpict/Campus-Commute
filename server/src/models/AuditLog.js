import mongoose from 'mongoose';
const schema = new mongoose.Schema({ admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, action: { type: String, required: true }, target: String, metadata: mongoose.Schema.Types.Mixed }, { timestamps: true });
schema.index({ createdAt: -1 });
export default mongoose.model('AuditLog', schema);
