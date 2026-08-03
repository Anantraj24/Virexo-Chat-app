# Virexo Architecture & System Design

## 1. System Overview & Monorepo Structure

Virexo is structured as a unified npm-workspaces monorepo designed for maximum maintainability, shared typing, and clean component isolation.

```
Virexo-Chat-app/
├── apps/
│   ├── web/               # React 19 + Vite + Tailwind CSS Frontend
│   └── api/               # Node.js + Express + Socket.io Backend
├── packages/
│   └── shared/            # Shared TypeScript interfaces, schemas & constants
└── docs/                  # Project specifications & build status tracking
```

---

## 2. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Client ["Client Layer (apps/web - Vercel)"]
        UI["React 19 UI (Linear/Discord Theme)"]
        State["Zustand Store (In-Memory Access Token)"]
        Query["TanStack Query (REST Cache)"]
        SocketClient["Socket.io Client (Real-time events)"]
    end

    subgraph Edge ["Security & Gateway Boundary"]
        Helmet["Helmet HTTP Headers"]
        Cors["Strict CORS Engine"]
        RateLimit["Express Rate Limiters"]
    end

    subgraph Server ["Backend Layer (apps/api - Render Free Web Service)"]
        Express["Express.js Server Engine"]
        AuthMiddleware["JWT Auth Middleware"]
        UploadHandler["Multer Memory Stream"]
        SocketServer["Socket.io Server Engine"]
    end

    subgraph External ["External Services (Free Tier)"]
        Mongo[("MongoDB Atlas M0\n(Persistence & Indexes)")]
        Cloudinary[("Cloudinary\n(Media Attachment CDN)")]
        Brevo[("Brevo API\n(Transactional Email)")]
    end

    UI --> State
    UI --> Query
    UI --> SocketClient

    Query -- "HTTPS / REST JSON" --> Helmet
    SocketClient -- "WSS / Socket Handshake" --> SocketServer

    Helmet --> Cors --> RateLimit --> Express
    Express --> AuthMiddleware
    AuthMiddleware --> Mongo
    Express --> UploadHandler --> Cloudinary
    Express --> Brevo
    SocketServer -- "Verify Handshake Token" --> AuthMiddleware
    SocketServer --> Mongo
```

---

## 3. Authentication & Refresh Token Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as Client App (React)
    participant AuthAPI as Express Auth Router
    participant Cookie as Browser Cookie Jar
    participant DB as MongoDB Atlas
    participant Socket as Socket.io Server

    Note over User, DB: Initial Authentication Flow
    User->>AuthAPI: POST /api/v1/auth/login {email, password}
    AuthAPI->>DB: Validate User Credentials (bcrypt)
    DB-->>AuthAPI: User Validated
    AuthAPI->>DB: Generate Refresh Token Hash & Save to User Record
    AuthAPI-->>Cookie: Set HttpOnly, Secure, SameSite=Strict Cookie (refreshToken)
    AuthAPI-->>User: Return 200 OK + { accessToken } (Stored in React Memory)

    Note over User, Socket: Real-Time Connection Setup
    User->>Socket: Connect Handshake { auth: { token: accessToken } }
    Socket->>Socket: Verify JWT Access Token
    Socket-->>User: Socket Connected & Joined User Rooms

    Note over User, DB: Silent Token Refresh Flow (Access Token Expired)
    User->>AuthAPI: POST /api/v1/auth/refresh (Cookie automatically sent)
    AuthAPI->>DB: Check Refresh Token Hash against DB Session Array
    alt Token Valid & Active
        AuthAPI->>DB: Rotate Refresh Token (Delete old hash, save new hash)
        AuthAPI-->>Cookie: Update HttpOnly Cookie (new refreshToken)
        AuthAPI-->>User: Return 200 OK + { accessToken: newAccessToken }
        User->>Socket: Emit 'auth:reauthenticate' { token: newAccessToken }
    else Token Reuse Detected (Compromised)
        AuthAPI->>DB: Invalidate ALL Refresh Tokens for User Session Family
        AuthAPI-->>Cookie: Clear Refresh Token Cookie
        AuthAPI-->>User: Return 401 Unauthorized (Force Logout)
    end
```

---

## 4. Separation of Responsibilities

To maintain clean system boundaries and optimize server resources, Virexo strictly separates REST API operations from Socket.IO real-time event streaming:

### 4.1 REST API Responsibilities (`/api/v1`)
- **Authentication & Session**: User registration, login, logout, token refresh, password reset.
- **Resource Management**: Channel creation, conversation metadata updates, user profile edits.
- **Paginated Data Retrieval**: Fetching historical messages (`/conversations/:id/messages?before=...`), search queries, member rosters.
- **Media Uploads**: Pre-flight validation, Multer memory buffer processing, Cloudinary streaming API dispatch.
- **Administrative & Compliance**: Submitting abuse reports, processing user bans, channel moderation.

### 4.2 Socket.IO Server Responsibilities
- **Instant Message Broadcast**: Pushing newly committed messages to active conversation rooms (`message:created`).
- **Transient State Notifications**: Broadcasting typing indicators (`typing:start`, `typing:stop`) without database persistence.
- **Presence Tracking**: Managing socket join/leave heartbeats and broadcasting user status changes (`user:presence_changed`).
- **Read Receipts**: Emitting real-time read acknowledgments (`message:read`) to conversation members.

---

## 5. Free-Tier Architectural Adaptations

1. **In-Memory Upload Streaming**: Render free instances lack persistent disk storage. Uploads process via `multer.memoryStorage()`, passing binary streams straight to Cloudinary.
2. **Database Connection Pooling**: Mongoose limits pool size (`maxPoolSize: 10`) to prevent exhausting MongoDB Atlas M0's 500-connection ceiling.
3. **Graceful Socket Reconnections**: React Socket client utilizes exponential backoff reconnection strategies to handle automatic server restarts or cold spins on Render.
