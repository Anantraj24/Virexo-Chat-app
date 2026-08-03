# Virexo API & Socket.IO Conventions

## 1. REST API Conventions

### 1.1 Base URL & Versioning
All API endpoints are prefixed with the current version namespace:
`https://<api-domain>/api/v1`

### 1.2 Standard Response Envelope

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 30,
    "hasMore": true
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed for request parameters",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  }
}
```

### 1.3 Rate Limiting Standards (`express-rate-limit`)

| Endpoint Group | Window | Max Requests | Action on Exceed |
| :--- | :--- | :--- | :--- |
| `/auth/login`, `/auth/register` | 15 minutes | 5 requests | HTTP 429 Too Many Requests |
| `/upload` | 15 minutes | 10 requests | HTTP 429 Too Many Requests |
| `/reports` | 1 hour | 5 requests | HTTP 429 Too Many Requests |
| Global API Standard | 1 minute | 100 requests | HTTP 429 Too Many Requests |

---

## 2. REST Endpoint Inventory

### 2.1 Authentication (`/auth`)
- `POST /auth/register` - Register a new user account.
- `POST /auth/login` - Authenticate user, issue access token & HttpOnly refresh cookie.
- `POST /auth/refresh` - Rotate refresh token & issue new in-memory access token.
- `POST /auth/logout` - Clear refresh cookie & revoke active refresh token hash.
- `GET /auth/me` - Fetch authenticated user profile data.

### 2.2 Users & Profiles (`/users`)
- `GET /users/me` - Get current user profile.
- `PATCH /users/me` - Update profile bio, status, or display settings.
- `POST /users/avatar` - Upload new user avatar (multipart form).
- `GET /users/search?q=query` - Search users by username (Rate-limited: 30/min).

### 2.3 Conversations & Channels (`/conversations`)
- `GET /conversations` - List conversations for current user.
- `POST /conversations` - Create a new DM or Group Channel.
- `GET /conversations/:id` - Fetch conversation details & member list.
- `POST /conversations/:id/members` - Add member to channel (Admin only).
- `DELETE /conversations/:id/members/:userId` - Remove/kick member (Admin only).

### 2.4 Messages (`/conversations/:id/messages`)
- `GET /conversations/:id/messages?before=<msgId>&limit=30` - Fetch paginated message history.
- `POST /conversations/:id/messages` - Send a message via REST (Fallback if Socket is offline).
- `PATCH /messages/:id` - Edit message content.
- `DELETE /messages/:id` - Delete message (Soft deletion).

### 2.5 Media Uploads (`/upload`)
- `POST /upload` - Upload image/document attachment to Cloudinary (Multipart stream, max 5MB).

---

## 3. Socket.IO Protocol Specifications

### 3.1 Connection & Handshake
Clients connect to Socket.IO using authentication headers:
```javascript
const socket = io(API_URL, {
  auth: {
    token: accessToken // In-memory JWT
  },
  transports: ['websocket']
});
```

### 3.2 Event Inventory & Schemas

#### Client -> Server Events
- `conversation:join` - `{ conversationId: string }`
- `conversation:leave` - `{ conversationId: string }`
- `message:send` - `{ conversationId: string, content?: string, attachments?: Array }`
- `typing:start` - `{ conversationId: string }`
- `typing:stop` - `{ conversationId: string }`
- `message:read` - `{ conversationId: string, messageId: string }`
- `auth:reauthenticate` - `{ token: string }`

#### Server -> Client Events
- `message:created` - `{ message: IMessage }`
- `message:updated` - `{ message: IMessage }`
- `message:deleted` - `{ messageId: string, conversationId: string }`
- `typing:update` - `{ conversationId: string, userId: string, isTyping: boolean }`
- `presence:changed` - `{ userId: string, status: 'online' | 'offline' | 'away' }`
- `message:acknowledged` - `{ messageId: string, userId: string, readAt: Date }`

---

## 4. Message Pagination Strategy

Virexo uses **Cursor-Based Pagination** anchored to the `_id` or `createdAt` timestamp of messages.

- **Request**: `GET /api/v1/conversations/123/messages?before=64f8a9b2c3d4e5f6a7b8c9d0&limit=30`
- **Database Query**:
  ```javascript
  Message.find({
    conversationId,
    _id: { $lt: beforeId }
  })
  .sort({ _id: -1 })
  .limit(limit);
  ```
- **Rationale**: Prevents missing or duplicate messages when new real-time messages are inserted into the conversation while the user scrolls historical logs.
