import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reportedMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    reportedConversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    reason: {
      type: String,
      required: true,
      enum: ['spam', 'harassment', 'inappropriate', 'other'],
    },
    description: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'investigating', 'resolved', 'dismissed'],
      default: 'pending',
    },
    moderatorNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending reports from the same user for the same entity
reportSchema.index(
  { reporter: 1, reportedUser: 1, reportedMessage: 1, reportedConversation: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

export const Report = mongoose.model('Report', reportSchema);
