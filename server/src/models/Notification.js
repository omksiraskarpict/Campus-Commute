import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    type: {
      type: String,
      required: true
    },

    title: {
      type: String,
      default: ''
    },

    message: {
      type: String,
      default: ''
    },

    relatedRide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null
    },

    relatedRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JoinRequest',
      default: null
    },

    read: {
      type: Boolean,
      default: false
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false
  }
);

export default mongoose.model('Notification', schema);