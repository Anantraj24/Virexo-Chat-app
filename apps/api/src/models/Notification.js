import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['group_invite', 'role_change', 'message_reaction', 'message_reply', 'mention'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityModel',
    },
    entityModel: {
      type: String,
      required: true,
      enum: ['Conversation', 'Message'],
    },
    content: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup of a user's notifications, ordered by creation date
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Prevent duplicate notifications for reactions/replies to the same message
// e.g. A reacts to B's message. We don't want to create 10 notifications if they toggle reaction.
// But we want to allow multiple different replies. For simplicity, we can let controllers handle dup prevention
// by querying existing unread notifications, or we can use a compound index.
// Using a sparse compound index for idempotency can be tricky here, so we will handle it in the controller.

export const Notification = mongoose.model('Notification', notificationSchema);
