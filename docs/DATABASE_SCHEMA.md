# Virexo Database Schema & Data Models

## 1. Overview & Data Design Strategy

Virexo uses MongoDB Atlas (M0 Free Tier) with Mongoose ORM. The data model balances document embedding for read speed (e.g. member sub-documents in conversations) with normalized references for unbounded collections (e.g. messages linked to conversations).

---

## 2. Collections & Entity Schemas

### 2.1 User Collection (`users`)

Stores user credentials, profile settings, presence metadata, and active refresh token session hashes.

```typescript
interface IUser {
  _id: Types.ObjectId;
  username: string;          // Indexed, Unique, lowercase
  email: string;             // Indexed, Unique, lowercase
  passwordHash: string;      // bcrypt hash
  avatarUrl?: string;        // Cloudinary CDN URL
  avatarPublicId?: string;   // Cloudinary public ID for deletion
  bio?: string;              // Max 200 chars
  status: 'online' | 'offline' | 'away';
  role: 'user' | 'admin';
  refreshTokenHashes: Array<{
    hash: string;
    createdAt: Date;
    expiresAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Mongoose Index Definitions
- `{ username: 1 }` (Unique, Sparse)
- `{ email: 1 }` (Unique)
- `{ "refreshTokenHashes.hash": 1 }` (Multikey index for fast session validation)

---

### 2.2 Conversation Collection (`conversations`)

Represents 1-on-1 Direct Messages (DMs) and multi-user Group Channels.

```typescript
interface IConversationMember {
  userId: Types.ObjectId;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  lastReadAt: Date;
}

interface IConversation {
  _id: Types.ObjectId;
  type: 'direct' | 'group' | 'channel';
  name?: string;               // Required for group/channel
  description?: string;        // Max 500 chars
  isPrivate: boolean;
  avatarUrl?: string;
  members: IConversationMember[];
  lastMessageId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Mongoose Index Definitions
- `{ "members.userId": 1, updatedAt: -1 }` (Compound index for fetching user's active conversations sorted by recency)
- `{ type: 1, isPrivate: 1 }` (Index for discovering public channels)

---

### 2.3 Message Collection (`messages`)

Stores all chat content, media attachments, and read tracking data.

```typescript
interface IAttachment {
  url: string;
  publicId: string;
  type: 'image' | 'document';
  filename: string;
  size: number; // In bytes (<5MB)
}

interface IMessage {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId; // References conversations._id
  senderId: Types.ObjectId;       // References users._id
  content?: string;               // Max 2000 chars
  attachments: IAttachment[];
  reactions: Array<{
    emoji: string;
    userId: Types.ObjectId;
  }>;
  readBy: Array<{
    userId: Types.ObjectId;
    readAt: Date;
  }>;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Mongoose Index Definitions
- `{ conversationId: 1, createdAt: -1 }` (Crucial compound index for reverse chronological message pagination)
- `{ content: "text" }` (Text index reserved for basic message search)

---

### 2.4 Report Collection (`reports`)

Stores abuse and content violation reports submitted by users for administrative moderation.

```typescript
interface IReport {
  _id: Types.ObjectId;
  reporterId: Types.ObjectId;
  targetType: 'user' | 'message' | 'conversation';
  targetId: Types.ObjectId;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Mongoose Index Definitions
- `{ status: 1, createdAt: -1 }` (Index for administrative review queue sorting)
- `{ reporterId: 1 }` (Index to enforce user report rate limits)

---

## 3. Data Relationship & Cardinality Summary

| Relationship | Type | Implementation Choice & Justification |
| :--- | :--- | :--- |
| **User <-> Conversations** | Many-to-Many | Embedded array of `IConversationMember` inside `conversations`. Preferred over join table to allow fast single-query conversation metadata hydration. |
| **Conversation <-> Messages** | One-to-Many | Referenced via `conversationId` in `messages`. Unbounded collection pattern prevents document size limit breaches (MongoDB 16MB limit). |
| **User <-> Refresh Tokens** | One-to-Many | Embedded array `refreshTokenHashes` inside `users` schema (capped at max 5 active sessions per user). |
| **Message <-> Attachments** | One-to-Few | Embedded array of `IAttachment` sub-documents directly within `IMessage` (capped at max 4 attachments per message). |
