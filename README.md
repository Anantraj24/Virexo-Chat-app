# Virexo — Production PERN Real-Time Chat Application

<p align="center">
  <img src="https://raw.githubusercontent.com/Anantraj24/Virexo-Chat-app/main/apps/web/public/favicon.svg" alt="Virexo Logo" width="80" height="80" onerror="this.style.display='none'" />
</p>

<h3 align="center">Enterprise-Grade Real-Time Messaging & Omni-Channel Workspace</h3>

<p align="center">
  A modern, high-performance PERN (PostgreSQL, Express, React 19, Node.js) real-time communication platform engineered with zero-trust in-memory authentication, WebSocket instant delivery, and a sleek Linear & WhatsApp Web-inspired multi-column interface.
</p>

<p align="center">
  <a href="https://virexo-chat-app.web.app"><img src="https://img.shields.io/badge/Live_Demo-Firebase_Hosting-0284c7?style=for-the-badge&logo=firebase&logoColor=white" alt="Live Demo" /></a>
  <a href="#test-results--quality-assurance"><img src="https://img.shields.io/badge/Tests-188%2F188_Passing-10b981?style=for-the-badge&logo=vitest&logoColor=white" alt="Tests 188/188 Passing" /></a>
  <a href="#tech-stack"><img src="https://img.shields.io/badge/Stack-PERN_Monorepo-6366f1?style=for-the-badge&logo=react&logoColor=white" alt="Stack" /></a>
  <a href="#security-architecture"><img src="https://img.shields.io/badge/Security-Zero--Trust_Auth-f43f5e?style=for-the-badge&logo=auth0&logoColor=white" alt="Security" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-amber?style=for-the-badge" alt="License" /></a>
</p>

---

## 🌐 Live Deployment & Demo Credentials

| Target | URL / Status | Provider |
| :--- | :--- | :--- |
| **Production Web Client** | **[https://virexo-chat-app.web.app](https://virexo-chat-app.web.app)** | Firebase Hosting |
| **Production API Service** | `https://virexo-api.onrender.com` | Render Web Service (`render.yaml`) |
| **Relational Database** | Serverless PostgreSQL Instance | Neon Postgres |
| **Media & Attachments CDN** | Controlled Streaming Buffer | Cloudinary |

### 🔑 Pre-Seeded Test Accounts

You can test bidirectional real-time messaging right away by logging in across two browser windows or incognito sessions:

| User | Username / Identifier | Password | Role |
| :--- | :--- | :--- | :--- |
| **User A** | `anant` *(or `anant@virexo.com`)* | `anant123` | Permanent User |
| **User B** | `shubham` *(or `shubham@virexo.com`)* | `shubham123` | Permanent User |

*Pre-configured with an existing direct message conversation for instant interactive testing.*

---

## ✨ Features & Capabilities

### ⚡ Real-Time Engine (Socket.IO)
- **Bidirectional Instant Messaging**: Microsecond message delivery across authorized channels and 1:1 direct conversations.
- **Presence & Activity Heartbeats**: Real-time user status detection (`online`, `offline`, `last seen`) with multi-tab connection deduplication.
- **Typing Indicators**: Ephemeral typing feedback with automatic 5-second expiration timers.
- **Three-Tier Delivery State**: Visual WhatsApp-style tick acknowledgments (`sent` single tick, `delivered` double tick, `read` blue double tick).
- **Privacy-Aware Read Receipts**: Configurable read receipt broadcasting respecting individual privacy settings (`everyone`, `contacts`, `nobody`).

### 🔒 Enterprise-Grade Security
- **Zero-Trust Token Architecture**: Short-lived JWT access tokens (15-minute lifespan) held strictly in React application memory (`useAuthStore`). **Zero `localStorage` exposure**, eliminating client-side XSS exfiltration vectors.
- **Rotating Refresh Tokens**: Cryptographically random UUID tokens stored in `HttpOnly`, `SameSite`, `Secure` cookies with SHA-256 database hashing and automatic **token reuse / family revocation detection**.
- **Dual-Identifier Authentication**: Flexible sign-in accepting either username or verified email address.
- **Defense in Depth**: Helmet HTTP security headers, CORS origin whitelisting, Bcrypt (cost factor 12) password hashing, and endpoint rate limiting via `express-rate-limit`.
- **Query Hardening & Sanitization**: Strict input validation using `express-validator` preventing parameter tampering and SQL injection.

### 🎨 Modern Omni-Channel SaaS Interface
- **Five-Column Workspace Layout**:
  1. **Icon Dock**: Instant navigation between home, messages, contacts, analytics, preferences, and user profile.
  2. **Folders & Channels**: Workspace channels, direct messages, and category filters.
  3. **Message Center**: Real-time conversation cards, unread badges, timestamp previews, search filters, and newest/oldest sorting.
  4. **Active Chat View**: Immersive chat viewport with customizable WhatsApp doodle wallpaper, speech bubble tails, date separators, and floating message composer.
  5. **Contact & Media Drawer**: Profile inspection, quick actions, contact details accordion, and shared document previews.
- **Responsive & Accessible**: Optimized for mobile and desktop screens with full keyboard navigation, screen reader ARIA live regions, and `prefers-reduced-motion` compliance.

### 💬 Comprehensive Message Operations
- **Message Editing**: Live inline message modification with automatic `(edited)` indicators and socket synchronizations.
- **Flexible Deletions**: Soft delete for current user (`delete for me`) or permanent revocation (`delete for everyone` within a 2-minute policy window).
- **Forwarding & Quoting**: Multi-conversation message forwarding via `ForwardMessageModal` and vertical accent reply cards.
- **Message Pinning**: Channel-wide pinned messages for important updates (restricted to channel owners/admins).
- **Emoji Reactions**: Real-time reactions with optimistic UI updates and socket broadcasts.
- **Idempotency Deduplication**: Sparse unique indexing on `idempotencyKey` preventing accidental double-posts during high-latency network blips.

### 📎 Cloud Media & Audio Attachments
- **Zero-Disk Streaming Uploads**: Multer memory buffer processing streaming directly to Cloudinary — zero dependency on ephemeral cloud container disks.
- **Rich Media Previews**: High-resolution image viewers, responsive video players, audio playback controls, and downloadable document cards (PDFs, ZIPs).
- **Browser Voice Notes**: Native in-browser voice recording powered by the Web MediaRecorder API with audio waveform playback and cancellation controls.

### 🔍 Relational Search & Notifications
- **Indexed Search**: Relational search indexing across messages, channels, and user directories with debouncing and keyword highlighting.
- **Multi-Channel Notification Center**: In-app notifications for replies, mentions, and invitations, paired with Web Notifications API triggers and audio alerts via the Web Audio API.

---

## 🛠️ Tech Stack & Monorepo Architecture

```
Virexo-Chat-app/
├── apps/
│   ├── web/               # React 19 + Vite + Tailwind CSS v4 Single Page App
│   └── api/               # Node.js + Express + Prisma + Socket.IO REST/WSS Service
├── packages/
│   └── shared/            # Shared event schemas, constants, and utilities
└── docs/                  # Architecture specs, database models, and build trackers
```

### Frontend (`apps/web`)
- **Core**: React 19, Vite 6, JavaScript (ES Modules)
- **Styling**: Tailwind CSS v4, Lucide Icons, Framer Motion
- **Routing**: React Router v7 / v8
- **State & Caching**: Zustand (auth, socket, preferences), TanStack Query v5 (REST cache)
- **Networking**: Axios (with silent refresh deduplication & CSRF token attach), Socket.io Client
- **Testing**: Vitest, React Testing Library, JSDOM

### Backend (`apps/api`)
- **Runtime & Framework**: Node.js 20+, Express.js 4 (ES Modules)
- **Database & ORM**: PostgreSQL (Neon Serverless), Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-pg`)
- **Real-Time Engine**: Socket.IO 4
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), Bcrypt.js, Cookie-Parser
- **File Management**: Multer (Memory Storage), Cloudinary SDK
- **Security & Quality**: Helmet, Express-Rate-Limit, Express-Validator, CORS
- **Email Service**: Brevo HTTP REST Adapter (with local console development fallback)
- **Testing**: Vitest, Supertest

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TB
    subgraph Client ["Client Layer (apps/web — Firebase Hosting)"]
        UI["React 19 UI (Linear & WhatsApp Theme)"]
        AuthStore["Zustand In-Memory Store (Access Token)"]
        QueryCache["TanStack Query (REST Cache)"]
        SocketClient["Socket.IO Client (Real-Time Events)"]
    end

    subgraph Gateway ["Edge & Security Boundary"]
        HelmetHeaders["Helmet Security Headers"]
        CorsEngine["Multi-Origin CORS Filter"]
        RateLimiter["Express Rate Limiters"]
    end

    subgraph Server ["Backend Layer (apps/api — Render Web Service)"]
        ExpressApp["Express.js HTTP Router (/api/v1)"]
        AuthFilter["JWT & Cookie Auth Middleware"]
        UploadStream["Multer Memory Stream"]
        SocketEngine["Socket.IO Server Engine"]
    end

    subgraph Data ["Persistence & External Infrastructure"]
        Postgres[("Neon PostgreSQL\n(Prisma Models & Indexes)")]
        CloudinaryCDN[("Cloudinary\n(Media Attachment CDN)")]
        BrevoEmail[("Brevo API\n(Transactional Email)")]
    end

    UI --> AuthStore
    UI --> QueryCache
    UI --> SocketClient

    QueryCache -- "HTTPS REST" --> HelmetHeaders
    SocketClient -- "WSS Handshake" --> SocketEngine

    HelmetHeaders --> CorsEngine --> RateLimiter --> ExpressApp
    ExpressApp --> AuthFilter
    AuthFilter --> Postgres
    ExpressApp --> UploadStream --> CloudinaryCDN
    ExpressApp --> BrevoEmail
    SocketEngine -- "Verify Handshake JWT" --> AuthFilter
    SocketEngine --> Postgres
```

### Silent Token Refresh Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as React Client (Memory)
    participant API as Express Auth API
    participant Cookie as Browser Cookie Store
    participant DB as PostgreSQL (Neon)

    User->>API: POST /api/v1/auth/login {identifier, password}
    API->>DB: Query user by username or email
    API->>DB: Verify bcrypt password hash
    API->>DB: Save SHA-256 hashed refresh token in database
    API-->>Cookie: Set HttpOnly, Secure, SameSite cookie (refreshToken)
    API-->>User: 200 OK + { accessToken } (held in Zustand memory)

    Note over User, API: Access Token expires after 15 minutes
    User->>API: GET /api/v1/conversations (Token expired -> 401)
    User->>API: POST /api/v1/auth/refresh (Cookie sent automatically)
    API->>DB: Look up token hash in RefreshToken table
    alt Valid Active Token
        API->>DB: Delete old token, insert new hashed token (Rotation)
        API-->>Cookie: Set rotated HttpOnly cookie
        API-->>User: 200 OK + { accessToken: newAccessToken }
        User->>API: Re-try original GET request seamlessly
    else Token Reuse Detected (Compromised)
        API->>DB: Revoke all refresh tokens for this user
        API-->>Cookie: Clear cookie
        API-->>User: 401 Unauthorized (Trigger clean logout)
    end
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: Neon Serverless database or local PostgreSQL instance (v14+)
- **Cloudinary Account**: Free tier cloud name, API key, and secret for media attachments

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Anantraj24/Virexo-Chat-app.git
cd Virexo-Chat-app
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory (or configure per-workspace `.env` files):

```bash
# Copy example template
cp .env.example .env
```

#### Monorepo Root / API `.env` Configuration
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/virexo?sslmode=require"

# JWT Secrets (Minimum 32 random characters)
JWT_ACCESS_SECRET="your_ultra_secure_jwt_access_secret_32chars_min"
JWT_REFRESH_SECRET="your_ultra_secure_jwt_refresh_secret_32chars_min"

# Email Delivery (console for development, brevo for production)
EMAIL_PROVIDER=console
EMAIL_FROM_NAME="Virexo"
EMAIL_FROM_ADDRESS="noreply@virexo.app"
# BREVO_API_KEY="xkeysib-..."

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
```

#### Frontend (`apps/web/.env`)
```env
VITE_API_URL=http://localhost:5000
```

### 3. Database Setup & Seeding
```bash
# Generate Prisma Client
npm run build -w apps/api

# Push schema to PostgreSQL
npx prisma db push --schema=apps/api/prisma/schema.prisma

# Seed demo users (anant and shubham)
npm run db:seed -w apps/api
```

### 4. Run Development Servers
Start both the API service and the React frontend concurrently with a single command:
```bash
npm run dev
```

- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`

---

## 🧪 Test Results & Quality Assurance

Virexo enforces strict continuous verification across all monorepo layers:

```bash
# Run complete test suite across all workspaces
npm test

# Run API integration and unit tests (125 tests)
npm run test:api

# Run Web React component and hook tests (63 tests)
npm run test:web

# Run monorepo linter (0 errors, 0 warnings)
npm run lint

# Build all monorepo packages for production
npm run build
```

### Monorepo Test Summary
```
Test Files  18 passed (18)
     Tests  188 passed (188)
  Duration  ~12.5s (API integration suites + Web unit suites)
  Linting   0 errors, 0 warnings across all workspaces
```

---

## 📦 Deployment Guide

### Frontend Deployment (Firebase Hosting)
Virexo Web is pre-configured with Firebase Hosting SPA rewrite rules:
```bash
# Build production web bundle and deploy to Firebase Hosting
npm run deploy:firebase
```

### Backend Deployment (Render Web Service)
Virexo API includes a turnkey Infrastructure-as-Code blueprint (`render.yaml`):
1. Connect this repository to your [Render Dashboard](https://dashboard.render.com).
2. Create a new **Blueprint** instance selecting `render.yaml`.
3. Provide your environment variables (`DATABASE_URL`, `CLOUDINARY_...`, etc.).
4. Render automatically runs `npm install && npm run build` and starts `npm run start -w apps/api`.

---

## 🗄️ Relational Database Schema (Prisma)

The application utilizes PostgreSQL managed via Prisma ORM:

- **`User`**: Account identity, dual-identifier lookups, hashed passwords, avatar, presence stamps, privacy settings, notification configurations.
- **`RefreshToken`**: SHA-256 hashed rotating session tokens with explicit family association and revocation tracking.
- **`Conversation`**: Direct message (DM) and Group channels with direct key uniqueness and last-message cursors.
- **`ConversationMember`**: Role-based access control (`OWNER`, `ADMIN`, `MEMBER`), joined timestamps, and read receipt markers (`lastReadAt`, `lastDeliveredAt`).
- **`Message`**: Text content, attachments, replies, edits, soft deletions, and idempotency deduplication keys.
- **`MessageReaction`**: Emoji reactions keyed by user and message.
- **`MessageAudit`**: Edit history and audit metadata for enterprise governance.
- **`Notification`**: Real-time alert records for replies, reactions, invites, and mentions.
- **`Report`**: User, message, and conversation moderation reporting.

---

## 📄 License & Attribution

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for full details.

Developed with ❤️ as an enterprise-grade reference architecture for real-time full-stack web applications.
