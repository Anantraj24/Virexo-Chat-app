import prisma from '../config/prisma.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createApiResponse } from '@virexo/shared';
import { triggerNotification } from './notificationController.js';
import { getIO } from '../socket/socketServer.js';

// Helper: Generate a unique string for a direct conversation between two users
function generateDirectKey(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

// Helper: Standard include for conversation queries
const conversationInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          status: true,
          bio: true,
          role: true
        }
      }
    }
  }
};

// POST /api/v1/conversations/direct — Create or Retrieve Direct DM Conversation
export async function createOrGetDirect(req, res, next) {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user.id || req.user.id;

    if (recipientId === currentUserId) {
      throw new BadRequestError('Cannot start a direct message with yourself', 'INVALID_RECIPIENT');
    }

    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      throw new NotFoundError('Recipient user not found', 'USER_NOT_FOUND');
    }

    const directKey = generateDirectKey(currentUserId, recipientId);

    // Check if direct conversation already exists
    let conversation = await prisma.conversation.findUnique({
      where: { directKey },
      include: conversationInclude
    });

    if (conversation) {
      return res.status(200).json(
        createApiResponse(true, { conversation, isExisting: true })
      );
    }

    // Create new direct conversation
    conversation = await prisma.conversation.create({
      data: {
        type: 'direct',
        directKey,
        isPrivate: true,
        members: {
          create: [
            { userId: currentUserId, role: 'member' },
            { userId: recipientId, role: 'member' }
          ]
        }
      },
      include: conversationInclude
    });

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
    const currentUserId = req.user.id || req.user.id;

    // Deduplicate & exclude current user
    const uniqueMemberIds = [
      ...new Set(memberIds.map((id) => id.toString())),
    ].filter((id) => id !== currentUserId);

    // Verify all member IDs exist
    if (uniqueMemberIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: uniqueMemberIds } }
      });
      if (users.length !== uniqueMemberIds.length) {
        throw new BadRequestError('One or more member IDs are invalid', 'INVALID_MEMBER_IDS');
      }
    }

    const membersData = [
      { userId: currentUserId, role: 'owner' },
      ...uniqueMemberIds.map((id) => ({
        userId: id,
        role: 'member'
      }))
    ];

    const conversation = await prisma.conversation.create({
      data: {
        type: 'group',
        name,
        description,
        isPrivate: true,
        members: {
          create: membersData
        }
      },
      include: conversationInclude
    });

    res.status(201).json(createApiResponse(true, { conversation }));
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/conversations — List Conversations with Cursor Pagination
export async function listConversations(req, res, next) {
  try {
    const currentUserId = req.user.id || req.user.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    const where = {
      members: {
        some: { userId: currentUserId }
      }
    };

    if (cursor) {
      where.updatedAt = { lt: cursor };
    }

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      include: conversationInclude
    });

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
    const currentUserId = req.user.id || req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

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
    const currentUserId = req.user.id || req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    if (conversation.type === 'direct') {
      throw new BadRequestError('Cannot edit details of a direct message conversation', 'CANNOT_EDIT_DIRECT');
    }

    const member = conversation.members.find((m) => m.userId === currentUserId);
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw new ForbiddenError('Only group owners and admins can edit group details', 'PERMISSION_DENIED');
    }

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (avatarUrl !== undefined) dataToUpdate.avatarUrl = avatarUrl;

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: dataToUpdate,
      include: conversationInclude
    });

    res.status(200).json(
      createApiResponse(true, { conversation: updatedConversation, message: 'Group updated successfully' })
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
    const currentUserId = req.user.id || req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    if (conversation.type === 'direct') {
      throw new BadRequestError('Cannot add members to a direct message conversation', 'CANNOT_ADD_TO_DIRECT');
    }

    const currentMember = conversation.members.find((m) => m.userId === currentUserId);
    if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
      throw new ForbiddenError('Only group owners and admins can add members', 'PERMISSION_DENIED');
    }

    const existingMemberIds = new Set(conversation.members.map((m) => m.userId));
    const newMemberIds = [...new Set(memberIds)].filter((mId) => !existingMemberIds.has(mId));

    if (newMemberIds.length === 0) {
      throw new BadRequestError('All specified users are already members of this group', 'ALREADY_MEMBERS');
    }

    const users = await prisma.user.findMany({ where: { id: { in: newMemberIds } } });
    if (users.length !== newMemberIds.length) {
      throw new BadRequestError('One or more user IDs are invalid', 'INVALID_USER_IDS');
    }

    const membersData = newMemberIds.map((mId) => ({
      userId: mId,
      conversationId: id,
      role: 'member'
    }));

    await prisma.conversationMember.createMany({
      data: membersData
    });

    // We can query again to get updated conversation with new members
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    newMemberIds.forEach((mId) => {
      triggerNotification({
        recipientId: mId,
        actorId: currentUserId,
        type: 'group_invite',
        entityId: id,
        entityModel: 'Conversation',
        content: `You were added to the group "${conversation.name}"`,
      }).catch(console.error);
    });

    res.status(200).json(
      createApiResponse(true, { conversation: updatedConversation, message: `${newMemberIds.length} member(s) added successfully` })
    );
  } catch (error) {
    next(error);
  }
}

// DELETE /api/v1/conversations/:id/members/:userId — Remove Member from Group
export async function removeMember(req, res, next) {
  try {
    const { id, userId } = req.params;
    const currentUserId = req.user.id || req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    if (conversation.type === 'direct') {
      throw new BadRequestError('Cannot remove members from a direct message conversation', 'CANNOT_REMOVE_FROM_DIRECT');
    }

    const currentMember = conversation.members.find((m) => m.userId === currentUserId);
    if (!currentMember) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    const targetMember = conversation.members.find((m) => m.userId === userId);
    if (!targetMember) {
      throw new NotFoundError('Target user is not a member of this conversation', 'TARGET_NOT_MEMBER');
    }

    const isSelf = userId === currentUserId;

    // Authorization checks
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

    await prisma.conversationMember.delete({
      where: {
        userId_conversationId: {
          userId,
          conversationId: id
        }
      }
    });

    // Force user's sockets to leave the conversation room
    try {
      getIO().in(`user:${userId}`).socketsLeave(`conversation:${id}`);
    } catch (e) {
      // Ignore socket errors in test mode
    }

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
    const currentUserId = req.user.id || req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const currentMember = conversation.members.find((m) => m.userId === currentUserId);
    if (!currentMember || currentMember.role !== 'owner') {
      throw new ForbiddenError('Only the group owner can promote or demote admin roles', 'PERMISSION_DENIED');
    }

    const targetMember = conversation.members.find((m) => m.userId === userId);
    if (!targetMember) {
      throw new NotFoundError('Target user is not a member of this conversation', 'TARGET_NOT_MEMBER');
    }

    if (userId === currentUserId) {
      throw new BadRequestError('Owner role cannot be changed via role update. Use transfer ownership.', 'INVALID_OPERATION');
    }

    await prisma.conversationMember.update({
      where: {
        userId_conversationId: {
          userId,
          conversationId: id
        }
      },
      data: { role }
    });

    const updatedConversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    triggerNotification({
      recipientId: userId,
      actorId: currentUserId,
      type: 'role_change',
      entityId: id,
      entityModel: 'Conversation',
      content: `Your role in "${conversation.name}" was updated to ${role}`,
    }).catch(console.error);

    res.status(200).json(
      createApiResponse(true, {
        conversation: updatedConversation,
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
    const currentUserId = req.user.id || req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const leavingMember = conversation.members.find((m) => m.userId === currentUserId);
    if (!leavingMember) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    if (leavingMember.role === 'owner' && conversation.members.length > 1) {
      // Find earliest admin, or earliest member to promote to owner
      const otherMembers = conversation.members.filter(m => m.userId !== currentUserId);
      const nextOwner = otherMembers.find(m => m.role === 'admin') || otherMembers[0];
      
      // Use transaction to update next owner and delete current member
      await prisma.$transaction([
        prisma.conversationMember.update({
          where: { userId_conversationId: { userId: nextOwner.userId, conversationId: id } },
          data: { role: 'owner' }
        }),
        prisma.conversationMember.delete({
          where: { userId_conversationId: { userId: currentUserId, conversationId: id } }
        })
      ]);
    } else {
      await prisma.conversationMember.delete({
        where: { userId_conversationId: { userId: currentUserId, conversationId: id } }
      });
    }

    // Check if no members remain
    const remainingCount = await prisma.conversationMember.count({ where: { conversationId: id } });
    if (remainingCount === 0) {
      await prisma.conversation.delete({ where: { id } });
      return res.status(200).json(
        createApiResponse(true, { message: 'Left group. Conversation deleted as no members remained.' })
      );
    }

    // Force user's sockets to leave the conversation room
    try {
      getIO().in(`user:${currentUserId}`).socketsLeave(`conversation:${id}`);
    } catch (e) {
      // Ignore socket errors in test mode
    }

    res.status(200).json(
      createApiResponse(true, { message: 'You left the group successfully' })
    );
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/conversations/:id/transfer-ownership — Transfer Group Ownership
export async function transferOwnership(req, res, next) {
  try {
    const { id } = req.params;
    const { newOwnerId } = req.body;
    const currentUserId = req.user.id || req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const currentOwner = conversation.members.find((m) => m.userId === currentUserId);
    if (!currentOwner || currentOwner.role !== 'owner') {
      throw new ForbiddenError('Only the current group owner can transfer ownership', 'PERMISSION_DENIED');
    }

    const newOwner = conversation.members.find((m) => m.userId === newOwnerId);
    if (!newOwner) {
      throw new BadRequestError('New owner must be an existing member of the group', 'TARGET_NOT_MEMBER');
    }

    if (newOwnerId === currentUserId) {
      throw new BadRequestError('You are already the owner of this group', 'ALREADY_OWNER');
    }

    // Transfer roles using transaction
    await prisma.$transaction([
      prisma.conversationMember.update({
        where: { userId_conversationId: { userId: currentUserId, conversationId: id } },
        data: { role: 'admin' }
      }),
      prisma.conversationMember.update({
        where: { userId_conversationId: { userId: newOwnerId, conversationId: id } },
        data: { role: 'owner' }
      })
    ]);

    const updatedConversation = await prisma.conversation.findUnique({
      where: { id },
      include: conversationInclude
    });

    res.status(200).json(
      createApiResponse(true, { conversation: updatedConversation, message: 'Group ownership transferred successfully' })
    );
  } catch (error) {
    next(error);
  }
}
