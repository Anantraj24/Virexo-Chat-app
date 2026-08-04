import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    type: {
      type: String,
      enum: ['image', 'document'],
      required: true,
    },
    filename: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const reactionSchema = new mongoose.Schema(
  {
    emoji: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: false }
);

const readBySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const auditSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    editedAt: { type: Date },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletedAt: { type: Date },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deletionScope: {
      type: String,
      enum: ['self', 'everyone'],
      default: 'self',
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    content: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message content cannot exceed 2000 characters'],
      default: '',
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
    readBy: {
      type: [readBySchema],
      default: [],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: { type: Date },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    audit: {
      type: auditSchema,
      default: () => ({ createdBy: null }),
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for reverse chronological cursor pagination & text search
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ content: 'text' });
messageSchema.index({ isPinned: -1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
