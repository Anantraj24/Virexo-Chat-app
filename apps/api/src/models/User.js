import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true },
    familyId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Must be a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    avatarUrl: { type: String, default: '' },
    avatarPublicId: { type: String, default: '' },
    bio: { type: String, maxlength: 200, default: '' },
    status: {
      type: String,
      enum: ['online', 'offline', 'away'],
      default: 'offline',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    refreshTokenHashes: [refreshTokenSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ 'refreshTokenHashes.hash': 1 });

// Omit sensitive fields when serializing to JSON
userSchema.methods.toJSON = function () {
  const userObj = this.toObject();
  delete userObj.passwordHash;
  delete userObj.refreshTokenHashes;
  delete userObj.__v;
  return userObj;
};

export const User = mongoose.model('User', userSchema);
