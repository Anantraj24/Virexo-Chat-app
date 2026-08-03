import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { User } from '../models/User.js';
import { hashToken } from '../utils/token.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Email Verification & Password Recovery Integration Tests', () => {
  const testUser = {
    username: 'verifyuser',
    email: 'verify@example.com',
    password: 'SecurePass123!',
  };

  // Helper: signup and return the DB user with raw verification token
  async function signupAndGetToken() {
    const res = await request(app).post('/api/v1/auth/signup').send(testUser);
    expect(res.status).toBe(201);

    const dbUser = await User.findOne({ email: testUser.email });
    // The raw token isn't directly available after signup (fire-and-forget),
    // so we generate a known token and set it directly for testing
    const crypto = await import('node:crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);

    dbUser.emailVerificationToken = hashedToken;
    dbUser.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    dbUser.lastVerificationSentAt = new Date(Date.now() - 120 * 1000); // 2 min ago (past cooldown)
    await dbUser.save();

    return { signupRes: res, rawToken, dbUser };
  }

  // ─── Signup Verification Fields ────────────────────────────────────

  it('POST /signup should create user with isEmailVerified=false and set verification token', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.data.user.isEmailVerified).toBe(false);

    // Verify token fields are set in DB but NOT leaked in response
    const dbUser = await User.findOne({ email: testUser.email });
    expect(dbUser.isEmailVerified).toBe(false);
    expect(dbUser.emailVerificationToken).toBeTruthy();
    expect(dbUser.emailVerificationExpires).toBeTruthy();
    expect(dbUser.lastVerificationSentAt).toBeTruthy();

    // Sensitive fields should not appear in API response
    expect(res.body.data.user.emailVerificationToken).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  // ─── Verify Email ──────────────────────────────────────────────────

  it('POST /verify-email should verify email with valid token', async () => {
    const { rawToken } = await signupAndGetToken();

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: rawToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('verified');

    // Verify DB state
    const dbUser = await User.findOne({ email: testUser.email });
    expect(dbUser.isEmailVerified).toBe(true);
    expect(dbUser.emailVerificationToken).toBeNull();
    expect(dbUser.emailVerificationExpires).toBeNull();
  });

  it('POST /verify-email should reject invalid token', async () => {
    await signupAndGetToken();

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'invalid_token_value_that_does_not_exist' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
  });

  it('POST /verify-email should reject expired token', async () => {
    const { rawToken } = await signupAndGetToken();

    // Expire the token
    await User.updateOne(
      { email: testUser.email },
      { emailVerificationExpires: new Date(Date.now() - 1000) }
    );

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: rawToken });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
  });

  // ─── Resend Verification ──────────────────────────────────────────

  it('POST /resend-verification should send new verification email', async () => {
    const { signupRes } = await signupAndGetToken();
    const token = signupRes.body.data.accessToken;

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Verification email sent');
  });

  it('POST /resend-verification should enforce 60-second cooldown', async () => {
    const { signupRes } = await signupAndGetToken();
    const token = signupRes.body.data.accessToken;

    // Set lastVerificationSentAt to just now (within cooldown)
    await User.updateOne(
      { email: testUser.email },
      { lastVerificationSentAt: new Date() }
    );

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('RESEND_COOLDOWN');
  });

  it('POST /resend-verification should reject for already-verified user', async () => {
    const { signupRes } = await signupAndGetToken();
    const token = signupRes.body.data.accessToken;

    // Mark email as verified
    await User.updateOne({ email: testUser.email }, { isEmailVerified: true });

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ALREADY_VERIFIED');
  });

  // ─── Forgot Password ─────────────────────────────────────────────

  it('POST /forgot-password should always return success (even for non-existent email)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /forgot-password should set reset token for existing user', async () => {
    await request(app).post('/api/v1/auth/signup').send(testUser);

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: testUser.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify DB has reset token
    const dbUser = await User.findOne({ email: testUser.email });
    expect(dbUser.passwordResetToken).toBeTruthy();
    expect(dbUser.passwordResetExpires).toBeTruthy();
    expect(dbUser.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());
  });

  // ─── Reset Password ──────────────────────────────────────────────

  it('POST /reset-password should update password and revoke all sessions', async () => {
    await request(app).post('/api/v1/auth/signup').send(testUser);

    // Set a known reset token
    const crypto = await import('node:crypto');
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = hashToken(rawResetToken);

    await User.updateOne(
      { email: testUser.email },
      {
        passwordResetToken: hashedResetToken,
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      }
    );

    const newPassword = 'NewSecurePass456!';
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawResetToken, password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toContain('Password reset successfully');

    // Verify all sessions revoked
    const dbUser = await User.findOne({ email: testUser.email });
    expect(dbUser.refreshTokenHashes.length).toBe(0);
    expect(dbUser.passwordResetToken).toBeNull();
    expect(dbUser.passwordResetExpires).toBeNull();

    // Verify old password no longer works
    const loginOld = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(loginOld.status).toBe(401);

    // Verify new password works
    const loginNew = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: newPassword,
    });
    expect(loginNew.status).toBe(200);
  });

  it('POST /reset-password should reject invalid reset token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'invalid_reset_token', password: 'NewPass123!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });

  it('POST /reset-password should reject expired reset token', async () => {
    await request(app).post('/api/v1/auth/signup').send(testUser);

    const crypto = await import('node:crypto');
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = hashToken(rawResetToken);

    // Set an already-expired token
    await User.updateOne(
      { email: testUser.email },
      {
        passwordResetToken: hashedResetToken,
        passwordResetExpires: new Date(Date.now() - 1000),
      }
    );

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawResetToken, password: 'NewPass123!' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
  });
});
