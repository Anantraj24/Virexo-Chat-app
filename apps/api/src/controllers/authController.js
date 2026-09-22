import crypto from 'node:crypto';
import prisma from '../config/prisma.js';
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
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';

// Constants
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_MINUTES = 60;
const RESEND_COOLDOWN_SECONDS = 60;

// Helper to generate a cryptographically secure hex token
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper to set HttpOnly refresh token cookie
function setRefreshTokenCookie(res, token, expiresInDays) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? 'none' : 'lax', // Support cross-origin Vercel/Render deployment
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

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new BadRequestError('An account with this email already exists', 'EMAIL_TAKEN');
      }
      throw new BadRequestError('This username is already taken', 'USERNAME_TAKEN');
    }

    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const rawVerificationToken = generateSecureToken();
    const hashedVerificationToken = hashToken(rawVerificationToken);
    const familyId = crypto.randomUUID();
    
    // We need to create the user and their first refresh token in a transaction
    // Or sequentially, since we need user ID for the token
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
        isEmailVerified: false,
        emailVerificationToken: hashedVerificationToken,
        emailVerificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
        lastVerificationSentAt: new Date(),
      }
    });

    const { token: refreshToken, expiresInDays } = generateRefreshToken(user, familyId, true);
    const hashedRefresh = hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        hash: hashedRefresh,
        familyId,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      }
    });

    // Fire-and-forget: send verification email (signup succeeds even if email fails)
    sendVerificationEmail(user.email, user.username, rawVerificationToken);

    setRefreshTokenCookie(res, refreshToken, expiresInDays);
    const accessToken = generateAccessToken(user);

    const safeUser = { ...user };
    delete safeUser.passwordHash;
    delete safeUser.emailVerificationToken;
    delete safeUser.emailVerificationExpires;
    delete safeUser.passwordResetToken;

    res.status(201).json(
      createApiResponse(true, {
        user: safeUser,
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
    const { identifier, password, rememberMe = true } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
      },
    });
    if (!user) {
      throw new UnauthorizedError('Invalid username/email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid username/email or password', 'INVALID_CREDENTIALS');
    }

    const familyId = crypto.randomUUID();
    const { token: refreshToken, expiresInDays } = generateRefreshToken(user, familyId, rememberMe);
    const hashedRefresh = hashToken(refreshToken);

    // Limit active sessions array to max 10 sessions per user
    const userTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' }
    });

    if (userTokens.length >= 10) {
      // Delete the oldest token
      await prisma.refreshToken.delete({ where: { id: userTokens[0].id } });
    }

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        hash: hashedRefresh,
        familyId,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      }
    });

    setRefreshTokenCookie(res, refreshToken, expiresInDays);
    const accessToken = generateAccessToken(user);

    const safeUser = { ...user };
    delete safeUser.passwordHash;
    delete safeUser.emailVerificationToken;
    delete safeUser.passwordResetToken;

    res.status(200).json(
      createApiResponse(true, {
        user: safeUser,
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
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      clearRefreshTokenCookie(res);
      throw new UnauthorizedError('User session not found', 'USER_NOT_FOUND');
    }

    const existingToken = await prisma.refreshToken.findFirst({
      where: { 
        userId: user.id,
        hash: hashedInput 
      }
    });

    // TOKEN REUSE DETECTION TRIGGERED
    if (!existingToken) {
      // Invalidate ALL tokens in this family
      await prisma.refreshToken.deleteMany({
        where: {
          userId: user.id,
          familyId: decoded.familyId
        }
      });
      clearRefreshTokenCookie(res);
      throw new UnauthorizedError(
        'Security alert: Attempted reuse of revoked token. Session revoked.',
        'TOKEN_REUSE_DETECTED'
      );
    }

    // Token is valid -> ROTATE
    await prisma.refreshToken.delete({ where: { id: existingToken.id } });

    const { token: newRefreshToken, expiresInDays } = generateRefreshToken(user, decoded.familyId, true);
    const newHashedRefresh = hashToken(newRefreshToken);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        hash: newHashedRefresh,
        familyId: decoded.familyId,
        expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
      }
    });

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
        await prisma.refreshToken.deleteMany({
          where: {
            userId: decoded.userId,
            hash: hashedInput
          }
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
    const userId = req.user.id || req.user.id;
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });

    clearRefreshTokenCookie(res);
    res.status(200).json(createApiResponse(true, { message: 'Logged out of all active sessions' }));
  } catch (error) {
    next(error);
  }
}

// Get Current User Profile Controller
export async function getMe(req, res) {
  // Ensure req.user doesn't have sensitive data if it's already stripped, but for safety:
  const safeUser = { ...req.user };
  delete safeUser.passwordHash;
  delete safeUser.emailVerificationToken;
  delete safeUser.passwordResetToken;
  
  res.status(200).json(createApiResponse(true, { user: safeUser }));
}

// ─── Email Verification & Password Recovery ─────────────────────────────

// Verify Email Controller
export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body;
    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { gt: new Date() },
      }
    });

    if (!user) {
      throw new BadRequestError('Verification token is invalid or has expired', 'INVALID_VERIFICATION_TOKEN');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      }
    });

    res.status(200).json(
      createApiResponse(true, { message: 'Email verified successfully' })
    );
  } catch (error) {
    next(error);
  }
}

// Resend Verification Email Controller
export async function resendVerification(req, res, next) {
  try {
    const userId = req.user.id || req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (user.isEmailVerified) {
      throw new BadRequestError('Email is already verified', 'ALREADY_VERIFIED');
    }

    // Enforce cooldown
    if (user.lastVerificationSentAt) {
      const elapsed = (Date.now() - user.lastVerificationSentAt.getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed);
        throw new BadRequestError(
          `Please wait ${remaining} seconds before requesting another verification email`,
          'RESEND_COOLDOWN'
        );
      }
    }

    const rawToken = generateSecureToken();
    const hashedToken = hashToken(rawToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
        lastVerificationSentAt: new Date(),
      }
    });

    await sendVerificationEmail(user.email, user.username, rawToken);

    res.status(200).json(
      createApiResponse(true, { message: 'Verification email sent' })
    );
  } catch (error) {
    next(error);
  }
}

// Forgot Password Controller
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;

    // Always return success to prevent user enumeration
    const successResponse = createApiResponse(true, {
      message: 'If an account with that email exists, a password reset link has been sent',
    });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(200).json(successResponse);
    }

    const rawToken = generateSecureToken();
    const hashedToken = hashToken(rawToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000),
      }
    });

    await sendPasswordResetEmail(user.email, user.username, rawToken);

    res.status(200).json(successResponse);
  } catch (error) {
    next(error);
  }
}

// Reset Password Controller
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      }
    });

    if (!user) {
      throw new BadRequestError('Reset token is invalid or has expired', 'INVALID_RESET_TOKEN');
    }

    // Update password and clear reset token
    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      }
    });

    // Revoke all active sessions (security: force re-authentication)
    await prisma.refreshToken.deleteMany({
      where: { userId: user.id }
    });

    res.status(200).json(
      createApiResponse(true, { message: 'Password reset successfully. Please log in with your new password.' })
    );
  } catch (error) {
    next(error);
  }
}
