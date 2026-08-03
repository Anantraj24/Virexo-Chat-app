import { User } from '../models/User.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { createApiResponse } from '@virexo/shared';

// Helper function to sanitize a public user object according to privacy settings
function formatPublicProfile(user) {
  const obj = user.toJSON();

  // Strip sensitive fields
  delete obj.email;
  delete obj.privacySettings;
  delete obj.notificationSettings;

  // Apply privacy settings
  if (user.privacySettings && !user.privacySettings.showOnlineStatus) {
    obj.status = 'offline';
  }
  if (user.privacySettings && !user.privacySettings.showLastSeen) {
    delete obj.lastSeen;
  }

  return obj;
}

// GET /api/v1/users/profile — Get Current User Profile
export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }
    res.status(200).json(createApiResponse(true, { user: user.toJSON() }));
  } catch (error) {
    next(error);
  }
}

// PATCH /api/v1/users/profile — Update Profile (username, displayName, bio, avatarUrl)
export async function updateProfile(req, res, next) {
  try {
    const { username, displayName, bio, avatarUrl } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    // Check unique username if username is changing
    if (username && username.toLowerCase() !== user.username) {
      const existingUser = await User.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        throw new BadRequestError('This username is already taken', 'USERNAME_TAKEN');
      }
      user.username = username.toLowerCase();
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    res.status(200).json(
      createApiResponse(true, {
        user: user.toJSON(),
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
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    if (showOnlineStatus !== undefined) user.privacySettings.showOnlineStatus = showOnlineStatus;
    if (showLastSeen !== undefined) user.privacySettings.showLastSeen = showLastSeen;
    if (allowDirectMessages !== undefined) user.privacySettings.allowDirectMessages = allowDirectMessages;

    await user.save();

    res.status(200).json(
      createApiResponse(true, {
        privacySettings: user.privacySettings,
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
    const user = await User.findById(req.user._id);

    if (!user) {
      throw new NotFoundError('User profile not found', 'USER_NOT_FOUND');
    }

    if (emailNotifications !== undefined) user.notificationSettings.emailNotifications = emailNotifications;
    if (desktopNotifications !== undefined) user.notificationSettings.desktopNotifications = desktopNotifications;
    if (soundEnabled !== undefined) user.notificationSettings.soundEnabled = soundEnabled;
    if (notifyOnMention !== undefined) user.notificationSettings.notifyOnMention = notifyOnMention;

    await user.save();

    res.status(200).json(
      createApiResponse(true, {
        notificationSettings: user.notificationSettings,
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

    const existingUser = await User.findOne({ username: targetUsername });
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
    const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const users = await User.find({
      $or: [{ username: searchRegex }, { displayName: searchRegex }],
    })
      .limit(20)
      .exec();

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

    // Check if valid ObjectId, else search by username
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(id);
    } else {
      user = await User.findOne({ username: id.toLowerCase() });
    }

    if (!user) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }

    res.status(200).json(createApiResponse(true, { user: formatPublicProfile(user) }));
  } catch (error) {
    next(error);
  }
}
