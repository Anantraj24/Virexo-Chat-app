# Virexo Product Requirements Document (PRD)

## 1. Executive Summary & Vision
**Virexo** is a high-performance, real-time MERN chat application featuring a modern, premium user interface inspired by Discord, Telegram, and Linear. It provides instant 1-on-1 direct messaging, group channels, rich media attachments, typing indicators, and user presence tracking.

The project is engineered for zero-cost operation by staying strictly within free-tier cloud limits while enforcing production-grade security, clean architecture, and rapid user feedback loops.

---

## 2. Target User Roles & Permissions Matrix

| Role | Access Level / Permissions |
| :--- | :--- |
| **Guest / Unauthenticated** | Can view landing/login pages, request password reset, register, and authenticate. |
| **Registered User** | Can edit personal profile, send/receive direct messages, create/join public or private channels, upload attachments (<5MB), send typing/presence events, and report policy violations. |
| **Channel Admin** | Has all Registered User permissions plus: edit channel settings, kick/ban members, delete any message within owned channel, update member roles. |
| **System Admin** | Full administrative rights: view global stats, suspend/ban user accounts globally, delete any channel or message, resolve content reports. |

---

## 3. Scope Definition

### 3.1 MVP Scope (Phase 1 - Phase 8 Implementation Target)
- **Authentication**: Email/password signup, login, JWT access tokens in React memory, secure HttpOnly rotating refresh tokens, silent refresh, logout.
- **Direct Messaging (1-on-1)**: Instant messaging, unread counts, read receipts, delivery status.
- **Group Channels**: Create, list, join, leave channels; public and private visibility settings.
- **Real-Time Engine**: Socket.IO delivery for messages, typing indicators (`typing_start`, `typing_stop`), presence updates (`online`, `offline`, `away`).
- **Media Attachments**: Image/document attachments (<5MB) uploaded via Express memory buffers to Cloudinary.
- **User Profiles**: Custom display name, avatar, bio, theme preference (Dark/Light).
- **UI/UX**: Responsive mobile-first layout, responsive desktop sidebar, Linear-inspired dark mode, accessible contrast, empty/loading/skeleton states.

### 3.2 Post-MVP Scope (Explicitly Deferred)
- **End-to-End Encryption (E2EE)** using Web Crypto API.
- **Voice / Video Calling** via WebRTC peer-to-peer mesh.
- **Rich Text / Markdown Editor** with live preview.
- **Full-Text Message Search** across multiple channels.
- **Custom Emoji Reactions** per message.
- **Web Push Notifications** (Service Workers).
- **Bot Integrations / Webhooks**.

### 3.3 Admin Scope
- **User Moderation**: Administrative panel to suspend/unban user accounts.
- **Channel Moderation**: Global channel review and termination.
- **Content Reporting System**: User report submission queue with Admin action triggers (Dismiss, Delete Content, Ban User).

---

## 4. Feature Conflicts & System Assumptions

### 4.1 Feature Conflicts & Resolved Trade-offs
1. **Conflict: Socket.IO State vs In-Memory Access Tokens**
   - *Problem*: Access tokens live solely in React application memory and expire every 15 minutes. Socket connections drop if tokens expire mid-session.
   - *Resolution*: Socket.IO handshake uses the current in-memory access token. When an HTTP silent refresh occurs, the client updates its internal token and emits an `auth:reauthenticate` Socket event to refresh connection credentials without disconnecting the WebSocket room state.

2. **Conflict: Render Free-Tier Cold Starts vs Instant Real-Time UX**
   - *Problem*: Render Web Services spin down after 15 minutes of inactivity, causing 30-50s initial latency on cold requests.
   - *Resolution*: Frontend employs optimistic UI rendering for outgoing messages and displays a unobtrusive "Connecting to server..." status bar during cold-start reconnects. REST client retries failing initial requests using exponential backoff.

3. **Conflict: File Uploads vs Render Ephemeral Filesystem**
   - *Problem*: Render Free Services do not persist local disk storage across restarts.
   - *Resolution*: All file uploads bypass disk storage entirely by using `multer.memoryStorage()` in Express to pipe streams directly to Cloudinary.

### 4.2 Core System Assumptions
- User base load remains under free-tier concurrency thresholds during initial deployment.
- Mobile browsers support WebSocket standard connections over HTTP/2.
- Media upload size cap of 5MB is sufficient for basic chat attachments (images, lightweight PDFs).

---

## 5. Testable Requirements & Acceptance Criteria

### 5.1 Authentication Requirements
- **REQ-AUTH-001**: User signup requires a valid email, username (3-30 alphanumeric characters), and password (minimum 8 characters with 1 number and 1 special character).
  - *Acceptance*: Submitting invalid credentials returns HTTP 400 with field-level validation errors.
- **REQ-AUTH-002**: Successful authentication sets an HttpOnly, SameSite=Strict cookie `refreshToken` and returns `accessToken` in the JSON payload.
  - *Acceptance*: Inspecting `localStorage` or `sessionStorage` in DevTools reveals no stored tokens.

### 5.2 Messaging Requirements
- **REQ-MSG-001**: A user can send a message up to 2000 characters in length to any conversation where they are an active member.
  - *Acceptance*: Message appears instantly on the sender's client via optimistic update and arrives on recipient clients in <200ms over active Socket connection.
- **REQ-MSG-002**: Loading a conversation fetches message history in reverse chronological pages of 30 items.
  - *Acceptance*: Scrolling to the top triggers fetching the next batch without duplicating existing messages.

### 5.3 Media Upload Requirements
- **REQ-UPL-001**: Uploaded files must be validated for MIME type (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`) and size (<= 5MB).
  - *Acceptance*: Attempting to upload a 6MB `.exe` file fails validation immediately with HTTP 400 before Cloudinary invocation.

---

## 6. Free-Tier Limitations & Operational Guardrails

| Provider | Service | Free Tier Limit | Architectural Guardrail |
| :--- | :--- | :--- | :--- |
| **Render** | Backend API | 512MB RAM, 0.1 vCPU, spins down after 15m idle | Keep Node process footprint <150MB RAM; streaming uploads; ping strategy. |
| **MongoDB Atlas** | Database | 512MB storage, 500 max connections, M0 cluster | Compound indexing; prune expired refresh tokens; cursor pagination. |
| **Cloudinary** | Media Storage | 25GB bandwidth / month, 25K transformations | Max 5MB file cap; aggressive image compression tokens on client upload. |
| **Brevo** | Transactional Email | 300 emails / day | Email verification and password reset rate-limited strictly (1 per min/user). |
| **Vercel** | Frontend Hosting | 100GB bandwidth / month | Static asset caching; bundle splitting with Vite to keep initial JS payload <200KB. |
