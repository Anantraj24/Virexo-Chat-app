import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, teardownTestDB } from './testSetup.js';
import {
  hashPassword,
  comparePassword,
  hashToken,
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';

// MongoMemoryServer is needed because env.js imports and token.js
// uses env vars that are resolved at module load time.
beforeAll(async () => {
  await setupTestDB();
}, 60000);

afterAll(async () => {
  await teardownTestDB();
});

describe('Token Utility Unit Tests', () => {
  describe('hashPassword / comparePassword', () => {
    it('should hash a password and verify it with comparePassword', async () => {
      const password = 'MySecurePassword123!';
      const hashed = await hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed).toMatch(/^\$2a\$/); // bcrypt prefix

      const isValid = await comparePassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hashed = await hashPassword('CorrectPassword1!');
      const isValid = await comparePassword('WrongPassword1!', hashed);
      expect(isValid).toBe(false);
    });
  });

  describe('hashToken', () => {
    it('should produce a deterministic 64-character hex string', () => {
      const token = 'some_refresh_token_value';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toBe(hash2); // deterministic
      expect(hash1).toHaveLength(64); // SHA-256 hex
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token_a');
      const hash2 = hashToken('token_b');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateAccessToken / verifyAccessToken', () => {
    const mockUser = {
      id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
    };

    it('should generate a JWT with expected claims', () => {
      const token = generateAccessToken(mockUser);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format

      const decoded = verifyAccessToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
    });

    it('should return null for an invalid token', () => {
      const result = verifyAccessToken('invalid.jwt.token');
      expect(result).toBeNull();
    });

    it('should return null for an empty string', () => {
      const result = verifyAccessToken('');
      expect(result).toBeNull();
    });
  });

  describe('generateRefreshToken / verifyRefreshToken', () => {
    const mockUser = {
      id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
    };

    it('should generate a refresh token with familyId and jti claims', () => {
      const familyId = 'family_abc123';
      const { token, expiresInDays } = generateRefreshToken(mockUser, familyId, true);

      expect(token).toBeDefined();
      expect(expiresInDays).toBe(7);

      const decoded = verifyRefreshToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.familyId).toBe(familyId);
      expect(decoded.jti).toBeDefined();
    });

    it('should use 1-day expiry when rememberMe is false', () => {
      const { expiresInDays } = generateRefreshToken(mockUser, 'fam_1', false);
      expect(expiresInDays).toBe(1);
    });

    it('should generate unique jti for each call', () => {
      const { token: t1 } = generateRefreshToken(mockUser, 'fam_1');
      const { token: t2 } = generateRefreshToken(mockUser, 'fam_1');

      const d1 = verifyRefreshToken(t1);
      const d2 = verifyRefreshToken(t2);

      expect(d1.jti).not.toBe(d2.jti);
    });

    it('should return null for an invalid refresh token', () => {
      const result = verifyRefreshToken('bad.refresh.token');
      expect(result).toBeNull();
    });
  });
});
