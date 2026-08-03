# Virexo Build Status & Progress Tracker

## 1. Executive Status Summary
- **Current Phase**: **Phase 8 - Conversation Domain**
- **Overall Status**: Direct DM uniqueness, group channels, cursor pagination, role-based authorization, member role management, ownership transfer, and frontend modals/sidebar integration implemented, tested & verified
- **Monorepo Readiness**: Active Workspaces (`apps/web`, `apps/api`, `packages/shared`)

---

## 2. Development Roadmap & Phase Tracker

| Phase | Description | Scope / Deliverables | Status |
| :---: | :--- | :--- | :---: |
| **Phase 1** | **Technical Specification** | PRD, Architecture, Database Schema, API Conventions, Security Model, Build Status | **COMPLETE** |
| **Phase 2** | **Monorepo & Backend Core** | Workspaces, Express app/server separation, Mongo connection lifecycle, error handling, readiness, Vitest tests | **COMPLETE** |
| **Phase 3** | **Frontend Foundation & Design System** | React Router, TanStack Query, Axios, Zustand preferences, UI component library, responsive layouts, 404, reduced motion | **COMPLETE** |
| **Phase 4** | **Authentication Backend** | User model, bcrypt, short-lived JWT access tokens (15m), HttpOnly rotating refresh tokens, hashed token DB storage, reuse detection, auth rate limiting, middleware, Vitest & MongoMemoryServer tests | **COMPLETE** |
| **Phase 5** | **Email Verification & Password Recovery** | Email service with Brevo/console adapters, verify email, resend with cooldown, forgot password (no enumeration), reset password (revokes sessions), HTML+text templates, integration tests | **COMPLETE** |
| **Phase 6** | **Authentication Frontend** | Login, signup, remember me, verify-email result, resend verification, forgot password, reset password, ProtectedRoute, GuestRoute, in-memory tokens, silent refresh, Axios 401 refresh dedup, logout & logout-all UI, Vitest web tests | **COMPLETE** |
| **Phase 7** | **User Profile, Privacy & Preferences** | User schema extensions (displayName, bio, lastSeen, privacySettings, notificationSettings), profile update APIs, username availability check, search-safe user search, multi-tab SettingsPage, local FileReader avatar preview, UserProfileModal | **COMPLETE** |
| **Phase 8** | **Conversation Domain** | Mongoose Conversation model with embedded members, directKey uniqueness, group creation, cursor pagination, role-based authorization (owner/admin/member), member management, role promotion/demotion, ownership transfer, leaving group, conversationApi, sidebar live channel/DM rendering, NewDMModal, CreateGroupModal, GroupSettingsModal | **COMPLETE** |
| **Phase 9** | REST API & Upload Processing | Express controllers, validators, Cloudinary memory streaming, pagination endpoints | Pending |
| **Phase 10** | Real-Time Engine (Socket.IO) | Socket handshake auth, events (`message:send`, `typing`, `presence`), room handlers | Pending |
| **Phase 11** | Testing, Polish & Free-Tier Deployment | Vitest, RTL, Supertest, Playwright E2E, Vercel & Render deployment pipelines | Pending |

---

## 3. Verification & Acceptance Checklist

### Phase 1: Technical Specification
- [x] All requirements in `docs/PRODUCT_REQUIREMENTS.md` are testable and categorized into MVP, Post-MVP, and Admin scope.
- [x] Mermaid architecture and authentication sequence diagrams included in `docs/ARCHITECTURE.md`.
- [x] MongoDB collections, field types, relationships, and compound indexes defined in `docs/DATABASE_SCHEMA.md`.

### Phase 2: Monorepo & Backend Core
- [x] Environment variable validation module (`apps/api/src/config/env.js`).
- [x] MongoDB Mongoose connection lifecycle (`apps/api/src/config/db.js`).
- [x] Express app and server listener separation (`app.js` vs `index.js`).
- [x] Centralized error handling & custom `AppError` hierarchy (`apps/api/src/utils/errors.js`, `errorHandler.js`).

### Phase 3: Frontend Foundation & Design System
- [x] Routing foundation with React Router (`BrowserRouter`, public layout, app layout, 404 handler).
- [x] Configured QueryClient (`@tanstack/react-query`) and Axios client with `X-Request-ID` interceptor.
- [x] Zustand preferences store (`usePreferencesStore`) supporting themes and reduced motion.
- [x] Reusable UI components library: `Button`, `Input`, `Avatar`, `Modal`, `Dropdown`, `Spinner`, `Skeleton`, `Toast`, `EmptyState`.

### Phase 4: Authentication Backend
- [x] Mongoose `User` model with `refreshTokenHashes` array, unique email/username indexes, and `toJSON()` password/token omission (`apps/api/src/models/User.js`).
- [x] Bcrypt password hashing (cost factor 12) & SHA-256 refresh token hashing (`apps/api/src/utils/token.js`).
- [x] Short-lived JWT access tokens (15m) and rotating refresh tokens with unique UUID `jti` payloads.
- [x] Endpoints: `POST /signup`, `POST /login` (rememberMe support), `POST /refresh`, `POST /logout`, `POST /logout-all`, `GET /me`.
- [x] Security features: HttpOnly SameSite=Strict cookies, token reuse detection (revokes all family sessions upon replay attack), generic auth errors.

### Phase 5: Email Verification & Password Recovery
- [x] Provider-independent email service with adapter pattern (`apps/api/src/services/emailService.js`).
- [x] Console adapter for local development (`apps/api/src/services/email/consoleAdapter.js`).
- [x] Brevo HTTP API adapter for production (`apps/api/src/services/email/brevoAdapter.js`) — uses native `fetch`, no SDK.

### Phase 6: Authentication Frontend
- [x] In-memory access token storage via Zustand (`useAuthStore.js`). Zero localStorage usage.
- [x] Axios request interceptor auto-attaches `Authorization: Bearer <token>` from memory.
- [x] Axios 401 response interceptor performs automatic token refresh with request deduplication.

### Phase 7: User Profile, Privacy & Preferences
- [x] Mongoose User model extended with `displayName`, `bio`, `lastSeen`, `privacySettings`, `notificationSettings`.
- [x] Profile, privacy, notification update APIs, username check, search-safe user query.

### Phase 8: Conversation Domain
- [x] Mongoose Conversation model with embedded `members` sub-document array (`userId`, `role`: owner/admin/member, `joinedAt`, `lastReadAt`).
- [x] Direct conversation uniqueness via `directKey` (`[idA, idB].sort().join('_')`). Re-requesting DM returns existing conversation without duplicates.
- [x] Endpoints under `/api/v1/conversations`:
  - `POST /direct` — create/retrieve 1-on-1 DM
  - `POST /group` — create multi-user group channel (sets creator as owner)
  - `GET /` — cursor-paginated active conversations list sorted by recency
  - `GET /:id` — conversation details (requires membership)
  - `PATCH /:id` — edit group details (requires owner/admin)
  - `POST /:id/members` — add group members (requires owner/admin)
  - `DELETE /:id/members/:userId` — remove member (requires owner/admin or self)
  - `PATCH /:id/members/:userId/role` — promote/demote admin role (requires owner)
  - `POST /:id/leave` — leave group with automatic owner fallback succession
  - `POST /:id/transfer-ownership` — transfer owner role to another member
- [x] `conversationValidators.js` — input validation rules.
- [x] `conversationApi.js` — Axios wrapper module.
- [x] `AppLayout.jsx` updated to render dynamic backend channels & DMs in sidebar.
- [x] UI Modals: `NewDMModal.jsx` (live user search), `CreateGroupModal.jsx` (group channel creation), `GroupSettingsModal.jsx` (role management & group settings).
- [x] All 63 tests passing across monorepo (40 backend integration + 23 frontend unit).
- [x] ESLint passing clean (0 errors, 0 warnings) and production build succeeded.
