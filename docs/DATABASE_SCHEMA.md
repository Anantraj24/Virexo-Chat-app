# Virexo Database Schema & Data Models

## 1. Overview & Data Design Strategy

Virexo uses PostgreSQL (Neon Free Tier) with Prisma ORM. The data model balances strict relational integrity (Foreign Keys, Cascades) with high-performance querying suitable for a real-time chat application.

---

## 2. Tables & Entity Schemas (Prisma)

### 2.1 User Table (`User`)

Stores user credentials, profile settings, presence metadata, and active refresh token session hashes.

```prisma
model User {
  id                       String    @id @default(cuid())
  username                 String    @unique
  displayName              String    @default("")
  email                    String    @unique
  passwordHash             String
  avatarUrl                String    @default("")
  avatarPublicId           String    @default("")
  bio                      String    @default("")
  status                   String    @default("offline")
  lastSeen                 DateTime  @default(now())
  role                     String    @default("user")
  accountStatus            String    @default("active")
  privacySettings          Json      @default("...")
  notificationSettings     Json      @default("...")
  isEmailVerified          Boolean   @default(false)
  emailVerificationToken   String?
  emailVerificationExpires DateTime?
  lastVerificationSentAt   DateTime?
  passwordResetToken       String?
  passwordResetExpires     DateTime?
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt

  refreshTokenHashes      RefreshToken[]
  conversationMemberships ConversationMember[]
  // ... relationships to messages, reactions, receipts, reports, audits
}
```

#### Key Indexes & Constraints
- `username` (Unique)
- `email` (Unique)

---

### 2.2 Conversation Table (`Conversation`)

Represents 1-on-1 Direct Messages (DMs) and multi-user Group Channels.

```prisma
model Conversation {
  id            String   @id @default(cuid())
  type          String
  name          String   @default("")
  description   String   @default("")
  isPrivate     Boolean  @default(true)
  avatarUrl     String   @default("")
  directKey     String?  @unique
  lastMessageId String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  members  ConversationMember[]
  messages Message[]
  reports  Report[]

  @@index([type, isPrivate])
}
```

#### Key Indexes & Constraints
- `directKey` (Unique) - Enforces 1-on-1 DM uniqueness.
- `@@index([type, isPrivate])` - For discovering public channels.

---

### 2.3 ConversationMember Table (`ConversationMember`)

Join table mapping users to conversations with role and read-state tracking.

```prisma
model ConversationMember {
  id              String   @id @default(cuid())
  userId          String
  conversationId  String
  role            String   @default("member")
  joinedAt        DateTime @default(now())
  lastReadAt      DateTime @default(now())
  lastDeliveredAt DateTime @default(now())

  user         User         @relation(...)
  conversation Conversation @relation(...)

  @@unique([userId, conversationId])
  @@index([userId, conversationId])
}
```

---

### 2.4 Message Table (`Message`)

Stores all chat content, thread hierarchy (replies/forwards), and core message states.

```prisma
model Message {
  id              String    @id @default(cuid())
  conversationId  String
  senderId        String
  content         String    @default("")
  idempotencyKey  String?   @unique
  replyToId       String?
  forwardedFromId String?
  isEdited        Boolean   @default(false)
  isDeleted       Boolean   @default(false)
  isPinned        Boolean   @default(false)
  pinnedAt        DateTime?
  pinnedById      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  conversation Conversation @relation(...)
  sender       User         @relation(...)
  attachments  Attachment[]
  reactions    Reaction[]
  readBy       ReadReceipt[]
  audit        MessageAudit?
  // ... self-relations for replies/forwards
}
```

#### Key Indexes & Constraints
- `@@index([conversationId, createdAt(sort: Desc)])` (Crucial for reverse chronological pagination)
- `@@index([senderId, createdAt(sort: Desc)])`
- `idempotencyKey` (Unique) - Prevents duplicate network requests.

---

### 2.5 Attachment Table (`Attachment`)

Normalized media attachments linked to messages.

```prisma
model Attachment {
  id        String @id @default(cuid())
  messageId String
  url       String
  publicId  String @default("")
  type      String
  filename  String
  size      Int
  duration  Int?
  width     Int?
  height    Int?

  message Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
}
```

---

### 2.6 Report Table (`Report`)

Stores abuse and content violation reports submitted by users.

```prisma
model Report {
  id                     String   @id @default(cuid())
  reporterId             String
  reportedUserId         String?
  reportedMessageId      String?
  reportedConversationId String?
  reason                 String
  description            String   @default("")
  status                 String   @default("pending")
  moderatorNotes         String   @default("")
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  
  // Relations to User, Message, Conversation
}
```

---

## 3. Data Relationship & Cardinality Summary

| Relationship | Type | Implementation Choice & Justification |
| :--- | :--- | :--- |
| **User <-> Conversations** | Many-to-Many | Explicit join table `ConversationMember` allowing metadata (role, lastReadAt). |
| **Conversation <-> Messages** | One-to-Many | `conversationId` Foreign Key in `Message` table. Scalable for unlimited messages. |
| **User <-> Refresh Tokens** | One-to-Many | `userId` Foreign Key in `RefreshToken` table. Isolated cleanup of old sessions. |
| **Message <-> Attachments** | One-to-Many | `messageId` Foreign Key in `Attachment` table. Supports rich media properties. |
| **Message <-> Message** | One-to-Many (Self) | `replyToId` and `forwardedFromId` Foreign Keys mapping to other messages for threading and forwarding. |
