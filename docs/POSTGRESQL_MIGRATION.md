# PostgreSQL Migration Report (Phase 20A)

## Overview
Virexo has successfully migrated its primary database from MongoDB (Mongoose) to PostgreSQL (Prisma). This migration aligns the application with modern relational database standards, enforcing strict data integrity via Foreign Keys, and resolves previous connection limits encountered on the MongoDB Atlas free tier.

## Architecture Decisions

### 1. ORM Choice: Prisma
Prisma was chosen as the ORM to interface with PostgreSQL for the following reasons:
- **Type Safety**: Prisma generates a fully typed client (`@prisma/client`) that integrates seamlessly with our codebase.
- **Declarative Schema**: The `schema.prisma` file provides a single source of truth for our database tables and relationships.
- **Relational Integrity**: Prisma handles cascading deletes natively when users, conversations, or messages are removed.

### 2. Identifier Strategy (`cuid` vs `ObjectId`)
MongoDB utilized 24-character hexadecimal `ObjectId` strings for primary keys. PostgreSQL and Prisma are configured to use 25-character `cuid` (Collision Resistant Unique Identifier) strings for all primary keys.
- **Frontend Refactor**: All instances of `_id` in React components, Zustand stores, and Axios payloads were globally replaced with `id`.
- **Validation**: Express-validator middleware instances of `isMongoId()` were replaced with `isString()` to validate the new `cuid` format.

### 3. Schema Mapping
The document-based NoSQL collections were normalized into relational tables:
- `User` collection maps to `User` table.
- `Conversation` collection with embedded `members` maps to the `Conversation` table and a `ConversationMember` join table.
- `Message` collection with embedded `attachments` maps to the `Message` table and an `Attachment` table.
- Embedded arrays for `reactions` and `readBy` were extracted into the `Reaction` and `ReadReceipt` tables, establishing One-to-Many relationships.

### 4. Idempotency & Rate Limiting
- The idempotency key strategy (preventing duplicate message sends) was maintained by placing a `@unique` constraint on `idempotencyKey` in the `Message` table.
- Rate limiters were fine-tuned for development velocity, ensuring smooth operations during testing.

## Future Considerations
- Monitor PostgreSQL connection pools in production on the Render/Neon platforms.
- Consider utilizing PostgreSQL full-text search capabilities (e.g., `tsvector`) to replace basic text filtering.
