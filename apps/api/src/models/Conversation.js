import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    lastDeliveredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'channel'],
      required: [true, 'Conversation type is required'],
    },
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Conversation name cannot exceed 100 characters'],
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    directKey: {
      type: String,
      sparse: true,
      unique: true,
    },
    members: {
      type: [memberSchema],
      validate: {
        validator: function (members) {
          return members.length > 0;
        },
        message: 'Conversation must have at least one member',
      },
    },
    lastMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
conversationSchema.index({ 'members.userId': 1, updatedAt: -1 });
conversationSchema.index({ type: 1, isPrivate: 1 });
conversationSchema.index({ name: 'text', description: 'text' });

// Helper static function to compute directKey for 1-on-1 chats
conversationSchema.statics.generateDirectKey = function (userId1, userId2) {
  const sortedIds = [userId1.toString(), userId2.toString()].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

export const Conversation = mongoose.model('Conversation', conversationSchema);
