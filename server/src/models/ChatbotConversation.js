import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 2000 },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  messages: { type: [messageSchema], default: [] }
}, { timestamps: true });

export default mongoose.model('ChatbotConversation', schema);
