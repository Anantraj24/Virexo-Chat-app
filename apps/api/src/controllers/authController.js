import crypto from 'node:crypto';
import { User } from '../models/User.js';
import {
  hashPassword,
  comparePassword,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/token.js';
import { BadRequestError, UnauthorizedError } from '../utils/errors.js';
import { createApiResponse } from '@virexo/shared';
import { env } from '../config/env.js';

// Helper to set HttpOnly refresh token cookie
function setRefreshTokenCookie(res, token, expiresInDays) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    maxAge: expiresInDays * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });
}

// Helper to clear refresh token cookie
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
}

// Signup Controller
export async function signup(req, res, next) {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new BadRequestError('An account with this email already exists', 'EMAIL_TAKEN');
      }
      throw new BadRequestError('This username is already taken', 'USERNAME_TAKEN');
    }

    const passwordHash = await hashPassword(password);
    const user = new User({
      username,
      email,
      passwordHash,
      refreshTokenHashes: [],
    });

    const familyId = crypto.randomUUID();
    const { token: refreshToken, expiresInDays } = generateRefreshToken(user, familyId, true);
    const hashedRefresh = hashToken(refreshToken);

    user.refreshTokenHashes.push({
      hash: hashedRefresh,
      familyId,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    });

    await user.save();

    setRefreshTokenCookie(res, refreshToken, expiresInDays);
    const accessToken = generateAccessToken(user);

    res.status(201).json(
      createApiResponse(true, {
        user: user.toJSON(),
        accessToken,
      })
    );
  } catch (error) {
    next(error);
  }
}

// Login Controller
export async function login(req, res, next) {
  try {
    const { email, password, rememberMe = true } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const familyId = crypto.randomUUID();
    const { token: refreshToken, expiresInDays } = generateRefreshToken(user, familyId, rememberMe);
    const hashedRefresh = hashToken(refreshToken);

    // Limit active sessions array to max 10 sessions per user
    if (user.refreshTokenHashes.length >= 10) {
      user.refreshTokenHashes.shift();
    }

    user.refreshTokenHashes.push({
      hash: hashedRefresh,
      familyId,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    });

    await user.save();

    setRefreshTokenCookie(res, refreshToken, expiresInDays);
    const accessToken = generateAccessToken(user);

    res.status(200).json(
      createApiResponse(true, {
        user: user.toJSON(),
        accessToken,
      })
    );
  } catch (error) {
    next(error);
  }
}

// Refresh Token Controller (with Rotation & Reuse Detection)
export async function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token missing', 'NO_REFRESH_TOKEN');
    }

    const decoded = verifyRefreshToken(rawRefreshToken);
    if (!decoded) {
      clearRefreshTokenCookie(res);
      throw new UnauthorizedError('Refresh token invalid or expired', 'INVALID_REFRESH_TOKEN');
    }

    const hashedInput = hashToken(rawRefreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      clearRefreshTokenCookie(res);
      throw new UnauthorizedError('User session not found', 'USER_NOT_FOUND');
    }

    const tokenIndex = user.refreshTokenHashes.findIndex((t) => t.hash === hashedInput);

    // TOKEN REUSE DETECTION TRIGGERED
    if (tokenIndex === -1) {
      // Invalidate ALL tokens in this family or user account
      user.refreshTokenHashes = user.refreshTokenHashes.filter((t) => t.familyId !== decoded.familyId);
      await user.save();
      clearRefreshTokenCookie(res);
      throw new UnauthorizedError(
        'Security alert: Attempted reuse of revoked token. Session revoked.',
        'TOKEN_REUSE_DETECTED'
      );
    }

    // Token is valid -> ROTATE
    user.refreshTokenHashes.splice(tokenIndex, 1);

    const { token: newRefreshToken, expiresInDays } = generateRefreshToken(user, decoded.familyId, true);
    const newHashedRefresh = hashToken(newRefreshToken);

    user.refreshTokenHashes.push({
      hash: newHashedRefresh,
      familyId: decoded.familyId,
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    });

    await user.save();

    setRefreshTokenCookie(res, newRefreshToken, expiresInDays);
    const accessToken = generateAccessToken(user);

    res.status(200).json(
      createApiResponse(true, {
        accessToken,
      })
    );
  } catch (error) {
    next(error);
  }
}

// Logout Current Session Controller
export async function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    if (rawRefreshToken) {
      const hashedInput = hashToken(rawRefreshToken);
      const decoded = verifyRefreshToken(rawRefreshToken);

      if (decoded?.userId) {
        await User.findByIdAndUpdate(decoded.userId, {
          $pull: { refreshTokenHashes: { hash: hashedInput } },
        });
      }
    }

    clearRefreshTokenCookie(res);
    res.status(200).json(createApiResponse(true, { message: 'Logged out successfully' }));
  } catch (error) {
    next(error);
  }
}

// Logout All Sessions Controller
export async function logoutAll(req, res, next) {
  try {
    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, {
      $set: { refreshTokenHashes: [] },
    });

    clearRefreshTokenCookie(res);
    res.status(200).json(createApiResponse(true, { message: 'Logged out of all active sessions' }));
  } catch (error) {
    next(error);
  }
}

// Get Current User Profile Controller
export async function getMe(req, res) {
  res.status(200).json(createApiResponse(true, { user: req.user.toJSON() }));
}
