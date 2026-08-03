# Virexo Security Model & Safeguards

## 1. Authentication & Token Architecture

Virexo enforces strict, state-of-the-art token security to mitigate Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) vulnerabilities.

### 1.1 Access Token Security
- **Lifetime**: 15 minutes.
- **Storage Location**: **React Application Memory** (Zustand state).
- **Enforcement**: Access tokens are **never** stored in `localStorage`, `sessionStorage`, or non-HttpOnly cookies, completely eliminating token theft via XSS injection.

### 1.2 Refresh Token Security & Rotation Strategy
- **Lifetime**: 7 days.
- **Storage Location**: `HttpOnly`, `Secure` (HTTPS-only in production), `SameSite=Strict` browser cookie.
- **Database Hashing**: Refresh tokens are hashed using SHA-256 before being stored in the database (`refreshTokenHashes` array). Plaintext tokens are never stored at rest.
- **Automatic Token Rotation**: Every call to `/api/v1/auth/refresh` invalidates the submitted token hash and issues a brand-new refresh token cookie alongside a fresh access token.
- **Token Reuse Detection**: If an old or previously revoked refresh token is presented (indicating theft/replay attack), the backend immediately revokes **all** refresh tokens associated with that user session family, invalidating every active session and forcing re-authentication.

---

## 2. Infrastructure & Application Hardening

### 2.1 HTTP Headers & Web Security (`Helmet`)
Express API uses `helmet` to configure defensive HTTP security headers:
- `Content-Security-Policy` (CSP)
- `Strict-Transport-Security` (HSTS: 1 year, includeSubDomains)
- `X-Frame-Options: DENY` (Anti-Clickjacking)
- `X-Content-Type-Options: nosniff` (Anti-MIME Sniffing)
- `Referrer-Policy: strict-origin-when-cross-origin`

### 2.2 CORS Policy
- Allowed Origins: Restricted strictly to the Vercel production frontend domain (`https://virexo.vercel.app`) or `http://localhost:5173` in local development.
- `credentials: true` enabled to allow HttpOnly refresh cookies across origins.

### 2.3 Input Validation & Sanitization
- All external inputs are validated and sanitized at API boundaries using `express-validator`.
- MongoDB injection prevention via Mongoose strict query casting.
- Generic authentication errors (e.g. "Invalid email or password") to prevent user enumeration attacks.

---

## 3. Media Upload Security

Uploads pose significant risk if improperly handled. Virexo implements strict memory-only validation:

1. **Memory Buffering**: Uploads are held strictly in memory buffers using `multer.memoryStorage()`. No files are written to Render's ephemeral filesystem.
2. **Strict MIME Filtering**:
   - Allowed MIME Types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`.
   - File extensions are validated against MIME headers.
3. **File Size Cap**: Hard limit of **5MB** enforced by Multer prior to buffer allocation.
4. **Cloudinary Upload Isolation**: Files stream directly from memory buffer to Cloudinary CDN with sanitized public IDs.
