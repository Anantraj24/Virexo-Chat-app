import { Conversation } from '../models/Conversation.js';
import { User } from '../models/User.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createApiResponse } from '@virexo/shared';
import { triggerNotification } from './notificationController.js';

// Helper: Populate member user details cleanly
async function populateConversation(doc) {
  return doc.populate({
    path: 'members.userId',
    select: '_id username displayName avatarUrl status bio role',
  });
}

// POST /api/v1/conversations/direct — Create or Retrieve Direct DM Conversation
export async function createOrGetDirect(req, res, next) {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user._id.toString();

    if (recipientId === currentUserId) {
      throw new BadRequestError('Cannot start a direct message with yourself', 'INVALID_RECIPIENT');
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw new NotFoundError('Recipient user not found', 'USER_NOT_FOUND');
    }

    const directKey = Conversation.generateDirectKey(currentUserId, recipientId);

    // Check if direct conversation already exists (uniqueness)
    let conversation = await Conversation.findOne({ directKey });

    if (conversation) {
      await populateConversation(conversation);
      return res.status(200).json(
        createApiResponse(true, { conversation, isExisting: true })
      );
    }

    // Create new direct conversation
    conversation = new Conversation({
      type: 'direct',
      directKey,
      isPrivate: true,
      members: [
        { userId: currentUserId, role: 'member', joinedAt: new Date() },
        { userId: recipientId, role: 'member', joinedAt: new Date() },
      ],
    });

    await conversation.save();
    await populateConversation(conversation);

    res.status(201).json(
      createApiResponse(true, { conversation, isExisting: false })
    );
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/conversations/group — Create Group Conversation
export async function createGroup(req, res, next) {
  try {
    const { name, description = '', memberIds = [] } = req.body;
    const currentUserId = req.user._id.toString();

    // Deduplicate & exclude current user
    const uniqueMemberIds = [
      ...new Set(memberIds.map((id) => id.toString())),
    ].filter((id) => id !== currentUserId);

    // Verify all member IDs exist
    if (uniqueMemberIds.length > 0) {
      const users = await User.find({ _id: { $in: uniqueMemberIds } });
      if (users.length !== uniqueMemberIds.length) {
        throw new BadRequestError('One or more member IDs are invalid', 'INVALID_MEMBER_IDS');
      }
    }

    const members = [
      { userId: currentUserId, role: 'owner', joinedAt: new Date() },
      ...uniqueMemberIds.map((id) => ({
        userId: id,
        role: 'member',
        joinedAt: new Date(),
      })),
    ];

    const conversation = new Conversation({
      type: 'group',
      name,
      description,
      isPrivate: true,
      members,
    });

    await conversation.save();
    await populateConversation(conversation);

    res.status(201).json(createApiResponse(true, { conversation }));
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/conversations — List Conversations with Cursor Pagination
export async function listConversations(req, res, next) {
  try {
    const currentUserId = req.user._id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    const query = {
      'members.userId': currentUserId,
    };

    if (cursor) {
      query.updatedAt = { $lt: cursor };
    }

    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit + 1)
      .populate({
        path: 'members.userId',
        select: '_id username displayName avatarUrl status bio role',
      })
      .exec();

    const hasNextPage = conversations.length > limit;
    const items = hasNextPage ? conversations.slice(0, limit) : conversations;
    const nextCursor = hasNextPage ? items[items.length - 1].updatedAt.toISOString() : null;

    res.status(200).json(
      createApiResponse(true, {
        conversations: items,
        pagination: {
          limit,
          hasNextPage,
          nextCursor,
        },
      })
    );
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/conversations/:id — Get Conversation Details
export async function getConversationById(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    await populateConversation(conversation);
    res.status(200).json(createApiResponse(true, { conversation }));
  } catch (error) {
    next(error);
  }
}

// PATCH /api/v1/conversations/:id — Update Group Details
export async function updateGroup(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, avatarUrl } = req.body;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    if (conversation.type === 'direct') {
      throw new BadRequestError('Cannot edit details of a direct message conversation', 'CANNOT_EDIT_DIRECT');
    }

    const member = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenError('Only group owners and admins can edit group details', 'PERMISSION_DENIED');
    }

    if (name !== undefined) conversation.name = name;
    if (description !== undefined) conversation.description = description;
    if (avatarUrl !== undefined) conversation.avatarUrl = avatarUrl;

    await conversation.save();
    await populateConversation(conversation);

    res.status(200).json(
      createApiResponse(true, { conversation, message: 'Group updated successfully' })
    );
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/conversations/:id/members — Add Members to Group
export async function addMembers(req, res, next) {
  try {
    const { id } = req.params;
    const { memberIds } = req.body;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    if (conversation.type === 'direct') {
      throw new BadRequestError('Cannot add members to a direct message conversation', 'CANNOT_ADD_TO_DIRECT');
    }

    const currentMember = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      throw new ForbiddenError('Only group owners and admins can add members', 'PERMISSION_DENIED');
    }

    const existingMemberIds = new Set(conversation.members.map((m) => m.userId.toString()));
    const newMemberIds = [...new Set(memberIds)].filter((id) => !existingMemberIds.has(id));

    if (newMemberIds.length === 0) {
      throw new BadRequestError('All specified users are already members of this group', 'ALREADY_MEMBERS');
    }

    const users = await User.find({ _id: { $in: newMemberIds } });
    if (users.length !== newMemberIds.length) {
      throw new BadRequestError('One or more user IDs are invalid', 'INVALID_USER_IDS');
    }

    newMemberIds.forEach((id) => {
      conversation.members.push({
        userId: id,
        role: 'member',
        joinedAt: new Date(),
      });
      
      triggerNotification({
        recipientId: id,
        actorId: currentUserId,
        type: 'group_invite',
        entityId: conversation._id,
        entityModel: 'Conversation',
        content: `You were added to the group "${conversation.name}"`,
      }).catch(console.error);
    });

    await conversation.save();
    await populateConversation(conversation);

    res.status(200).json(
      createApiResponse(true, { conversation, message: `${newMemberIds.length} member(s) added successfully` })
    );
  } catch (error) {
    next(error);
  }
}

// DELETE /api/v1/conversations/:id/members/:userId — Remove Member from Group
export async function removeMember(req, res, next) {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    if (conversation.type === 'direct') {
      throw new BadRequestError('Cannot remove members from a direct message conversation', 'CANNOT_REMOVE_FROM_DIRECT');
    }

    const currentMember = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!currentMember) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    const targetMember = conversation.members.find((m) => m.userId.toString() === userId);
    if (!targetMember) {
      throw new NotFoundError('Target user is not a member of this conversation', 'TARGET_NOT_MEMBER');
    }

    const isSelf = userId === currentUserId;

    // Authorization checks:
    // If not self, must be owner or admin. Admin cannot remove owner or another admin.
    if (!isSelf) {
      if (currentMember.role === 'member') {
        throw new ForbiddenError('Only owners and admins can remove members', 'PERMISSION_DENIED');
      }
      if (currentMember.role === 'admin' && (targetMember.role === 'owner' || targetMember.role === 'admin')) {
        throw new ForbiddenError('Admins cannot remove the owner or other admins', 'PERMISSION_DENIED');
      }
    }

    // Owner cannot remove self without transferring ownership first
    if (isSelf && targetMember.role === 'owner' && conversation.members.length > 1) {
      throw new BadRequestError(
        'Group owner must transfer ownership before leaving',
        'OWNER_MUST_TRANSFER'
      );
    }

    conversation.members = conversation.members.filter((m) => m.userId.toString() !== userId);
    await conversation.save();

    res.status(200).json(
      createApiResponse(true, { message: isSelf ? 'You left the group' : 'Member removed successfully' })
    );
  } catch (error) {
    next(error);
  }
}

// PATCH /api/v1/conversations/:id/members/:userId/role — Promote/Demote Admin Role
export async function updateMemberRole(req, res, next) {
  try {
    const { id, userId } = req.params;
    const { role } = req.body; // 'admin' or 'member'
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const currentMember = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!currentMember || currentMember.role !== 'owner') {
      throw new ForbiddenError('Only the group owner can promote or demote admin roles', 'PERMISSION_DENIED');
    }

    const targetMember = conversation.members.find((m) => m.userId.toString() === userId);
    if (!targetMember) {
      throw new NotFoundError('Target user is not a member of this conversation', 'TARGET_NOT_MEMBER');
    }

    if (userId === currentUserId) {
      throw new BadRequestError('Owner role cannot be changed via role update. Use transfer ownership.', 'INVALID_OPERATION');
    }

    targetMember.role = role;
    await conversation.save();
    await populateConversation(conversation);

    triggerNotification({
      recipientId: userId,
      actorId: currentUserId,
      type: 'role_change',
      entityId: conversation._id,
      entityModel: 'Conversation',
      content: `Your role in "${conversation.name}" was updated to ${role}`,
    }).catch(console.error);

    res.status(200).json(
      createApiResponse(true, {
        conversation,
        message: `Member role updated to ${role}`,
      })
    );
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/conversations/:id/leave — Leave Group
export async function leaveGroup(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const memberIndex = conversation.members.findIndex((m) => m.userId.toString() === currentUserId);
    if (memberIndex === -1) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    const leavingMember = conversation.members[memberIndex];

    // If owner leaves and other members exist, auto-promote the earliest joined admin or member
    if (leavingMember.role === 'owner' && conversation.members.length > 1) {
      conversation.members.splice(memberIndex, 1);

      // Find earliest admin, or earliest member
      const nextOwner =
        conversation.members.find((m) => m.role === 'admin') || conversation.members[0];
      nextOwner.role = 'owner';
    } else {
      conversation.members.splice(memberIndex, 1);
    }

    // If no members remain, delete conversation
    if (conversation.members.length === 0) {
      await Conversation.findByIdAndDelete(id);
      return res.status(200).json(
        createApiResponse(true, { message: 'Left group. Conversation deleted as no members remained.' })
      );
    }

    await conversation.save();
    res.status(200).json(createApiResponse(true, { message: 'Left group successfully' }));
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/conversations/:id/transfer-ownership — Transfer Group Ownership
export async function transferOwnership(req, res, next) {
  try {
    const { id } = req.params;
    const { newOwnerId } = req.body;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const currentOwner = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!currentOwner || currentOwner.role !== 'owner') {
      throw new ForbiddenError('Only the current group owner can transfer ownership', 'PERMISSION_DENIED');
    }

    const newOwner = conversation.members.find((m) => m.userId.toString() === newOwnerId);
    if (!newOwner) {
      throw new BadRequestError('New owner must be an existing member of the group', 'TARGET_NOT_MEMBER');
    }

    if (newOwnerId === currentUserId) {
      throw new BadRequestError('You are already the owner of this group', 'ALREADY_OWNER');
    }

    // Transfer roles
    currentOwner.role = 'admin';
    newOwner.role = 'owner';

    await conversation.save();
    await populateConversation(conversation);

    res.status(200).json(
      createApiResponse(true, { conversation, message: 'Group ownership transferred successfully' })
    );
  } catch (error) {
    next(error);
  }
}
