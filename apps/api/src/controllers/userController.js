import prisma from '../config/prisma.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { createApiResponse } from '@virexo/shared';

// Helper function to sanitize a public user object according to privacy settings
function formatPublicProfile(user) {
  // Prisma returns plain JS objects, not mongoose documents, so no need to call .toJSON()
  const obj = { ...user };

  // Strip sensitive fields
  delete obj.passwordHash;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.lastVerificationSentAt;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.email;
  delete obj.privacySettings;
  delete obj.notificationSettings;

  // Apply privacy settings (Assuming privacySettings is parsed as a JSON object)
  const privacySettings = typeof user.privacySettings === 'string' ? JSON.parse(user.privacySettings) : user.privacySettings;
  
  if (privacySettings && !privacySettings.showOnlineStatus) {
    obj.status = 'offline';
  }
  if (privacySettings && !privacySettings.showLastSeen) {
    delete obj.lastSeen;
  }

  return obj;
}

// GET /api/v1/users/profile — Get Current User Profile
export async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id || req.user.id } });
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }
    
    // Strip sensitive fields
    const safeUser = { ...user };
    delete safeUser.passwordHash;
    delete safeUser.emailVerificationToken;
    delete safeUser.passwordResetToken;
    
    res.status(200).json(createApiResponse(true, { user: safeUser }));
  } catch (error) {
    next(error);
  }
}

// PATCH /api/v1/users/profile — Update Profile (username, displayName, bio, avatarUrl)
export async function updateProfile(req, res, next) {
  try {
    const { username, displayName, bio, avatarUrl } = req.body;
    const userId = req.user.id || req.user.id;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    const dataToUpdate = {};

    // Check unique username if username is changing
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
      if (existingUser) {
        throw new BadRequestError('This username is already taken', 'USERNAME_TAKEN');
      }
      dataToUpdate.username = username.toLowerCase();
    }

    if (displayName !== undefined) dataToUpdate.displayName = displayName;
    if (bio !== undefined) dataToUpdate.bio = bio;
    if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    const safeUser = { ...updatedUser };
    delete safeUser.passwordHash;
    delete safeUser.emailVerificationToken;
    delete safeUser.passwordResetToken;

    res.status(200).json(
      createApiResponse(true, {
        user: safeUser,
        message: 'Profile updated successfully',
      })
    );
  } catch (error) {
    next(error);
  }
}

// PATCH /api/v1/users/privacy — Update Privacy Settings
export async function updatePrivacy(req, res, next) {
  try {
    const { showOnlineStatus, showLastSeen, allowDirectMessages } = req.body;
    const userId = req.user.id || req.user.id;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    const privacySettings = typeof user.privacySettings === 'string' ? JSON.parse(user.privacySettings) : user.privacySettings || {};

    if (showOnlineStatus !== undefined) privacySettings.showOnlineStatus = showOnlineStatus;
    if (showLastSeen !== undefined) privacySettings.showLastSeen = showLastSeen;
    if (allowDirectMessages !== undefined) privacySettings.allowDirectMessages = allowDirectMessages;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { privacySettings }
    });

    res.status(200).json(
      createApiResponse(true, {
        privacySettings: updatedUser.privacySettings,
        message: 'Privacy settings updated successfully',
      })
    );
  } catch (error) {
    next(error);
  }
}

// PATCH /api/v1/users/notifications — Update Notification Settings
export async function updateNotifications(req, res, next) {
  try {
    const { emailNotifications, desktopNotifications, soundEnabled, notifyOnMention } = req.body;
    const userId = req.user.id || req.user.id;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    const notificationSettings = typeof user.notificationSettings === 'string' ? JSON.parse(user.notificationSettings) : user.notificationSettings || {};

    if (emailNotifications !== undefined) notificationSettings.emailNotifications = emailNotifications;
    if (desktopNotifications !== undefined) notificationSettings.desktopNotifications = desktopNotifications;
    if (soundEnabled !== undefined) notificationSettings.soundEnabled = soundEnabled;
    if (notifyOnMention !== undefined) notificationSettings.notifyOnMention = notifyOnMention;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { notificationSettings }
    });

    res.status(200).json(
      createApiResponse(true, {
        notificationSettings: updatedUser.notificationSettings,
        message: 'Notification settings updated successfully',
      })
    );
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/users/check-username?username=xyz — Check Username Availability
export async function checkUsername(req, res, next) {
  try {
    const { username } = req.query;
    const targetUsername = username.toLowerCase();

    // If current authenticated user owns this username, it's available for them
    if (req.user && req.user.username === targetUsername) {
      return res.status(200).json(
        createApiResponse(true, { username: targetUsername, isAvailable: true, isCurrent: true })
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { username: targetUsername } });
    const isAvailable = !existingUser;

    res.status(200).json(
      createApiResponse(true, { username: targetUsername, isAvailable, isCurrent: false })
    );
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/users/search?q=xyz — Search Users
export async function searchUsers(req, res, next) {
  try {
    const { q } = req.query;
    
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 20
    });

    const sanitizedUsers = users.map((u) => formatPublicProfile(u));

    res.status(200).json(
      createApiResponse(true, { users: sanitizedUsers, count: sanitizedUsers.length })
    );
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/users/:id — Get Public User Profile by ID or Username
export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    let user;

    // Check if it looks like a cuid/uuid, else search by username
    // For simplicity, we just try to find by ID first, then fallback to username
    user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      user = await prisma.user.findUnique({ where: { username: id.toLowerCase() } });
    }

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    res.status(200).json(createApiResponse(true, { user: formatPublicProfile(user) }));
  } catch (error) {
    next(error);
  }
}
