import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// Password Hashing
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

// SHA-256 Refresh Token Hashing for DB Storage
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// JWT Token Generation
export function generateAccessToken(user) {
  const payload = {
    userId: user.id || user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function generateRefreshToken(user, familyId, rememberMe = true) {
  const expiresIn = rememberMe ? '7d' : '1d';
  const payload = {
    userId: user.id || user.id,
    familyId,
    jti: crypto.randomUUID(),
  };
  return {
    token: jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn }),
    expiresInDays: rememberMe ? 7 : 1,
  };
}

// JWT Token Verification
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch {
    return null;
  }
}
