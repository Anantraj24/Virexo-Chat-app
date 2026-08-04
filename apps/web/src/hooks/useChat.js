import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/ui/Toast';
import { useSocketStore } from '../store/useSocketStore';
import { socketClientManager } from '../lib/socketClient';
import { SOCKET_EVENTS } from '@virexo/shared';
import {
  getMessageHistoryRequest,
  sendMessageRequest,
  markReadRequest,
  editMessageRequest,
  deleteMessageRequest,
  deleteMessageForEveryoneRequest,
  pinMessageRequest,
  unpinMessageRequest,
  addReactionRequest,
  removeReactionRequest,
} from '../api/messageApi';
import { getConversationRequest } from '../api/conversationApi';

const PAGE_SIZE = 50;
const TYPING_TIMEOUT_MS = 2000;
const SCROLL_THRESHOLD = 100;

export function useChat(conversationId) {
  const { user: currentUser } = useAuthStore();
  const { addToast } = useToast();
  const typingUsers = useSocketStore((state) => state.getTypingUsersForConversation(conversationId));

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const [pagination, setPagination] = useState({ hasNextPage: false, nextCursor: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [failedMessages, setFailedMessages] = useState([]);

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);
  const conversationIdRef = useRef(conversationId);

  conversationIdRef.current = conversationId;

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const checkIfNearBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }, []);

  const loadConversationData = useCallback(async () => {
    const cid = conversationIdRef.current;
    if (!cid) return;
    setLoading(true);
    setError(null);

    try {
      const [convRes, historyRes] = await Promise.all([
        getConversationRequest(cid),
        getMessageHistoryRequest(cid, { limit: PAGE_SIZE }),
      ]);

      setConversation(convRes.data.conversation);
      setMessages(historyRes.data.messages || []);
      setPagination(historyRes.data.pagination || { hasNextPage: false, nextCursor: null });
      markReadRequest(cid).catch(() => {});

      const socket = socketClientManager.connect();
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId: cid });
        socket.emit(SOCKET_EVENTS.MESSAGE_READ, { conversationId: cid });
      }
    } catch (err) {
      setError(err.message || 'Failed to load conversation');
      addToast({ message: err.message || 'Failed to load conversation', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadConversationData();
  }, [loadConversationData]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [loading, messages.length, scrollToBottom]);

  useEffect(() => {
    const socket = socketClientManager.getSocket();
    if (!socket) return;

    const cid = conversationIdRef.current;

    const handleNewMessage = ({ message, conversationId: eventConvId }) => {
      if (eventConvId === cid) {
        setMessages((prev) => [...prev, message]);
        socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { conversationId: cid, messageId: message._id });
        socket.emit(SOCKET_EVENTS.MESSAGE_READ, { conversationId: cid });
        if (checkIfNearBottom()) {
          setTimeout(scrollToBottom, 50);
        }
      }
    };

    const handleDeletedMessage = ({ messageId, conversationId: eventConvId, deletionScope }) => {
      if (eventConvId === cid) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, isDeleted: true, content: '[This message was deleted]', attachments: [] }
              : m
          )
        );
      }
    };

    const handleMessageDelivered = ({ conversationId: eventConvId, messageId }) => {
      if (eventConvId === cid) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, status: 'delivered' } : m))
        );
      }
    };

    const handleMessageRead = ({ conversationId: eventConvId, messageId }) => {
      if (eventConvId === cid) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, status: 'read' } : m))
        );
      }
    };

    const handleMessageEdited = ({ messageId, conversationId: eventConvId, content, isEdited, editedAt }) => {
      if (eventConvId === cid) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId ? { ...m, content, isEdited, editedAt } : m
          )
        );
      }
    };

    const handleMessagePinned = ({ messageId, conversationId: eventConvId }) => {
      if (eventConvId === cid) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, isPinned: true } : m))
        );
      }
    };

    const handleMessageUnpinned = ({ messageId, conversationId: eventConvId }) => {
      if (eventConvId === cid) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, isPinned: false } : m))
        );
      }
    };

    const handleReactionAdded = ({ messageId, conversationId: eventConvId, emoji, userId }) => {
      if (eventConvId === cid) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id !== messageId) return m;
            const existing = m.reactions.find((r) => r.emoji === emoji && r.userId.toString() === userId);
            if (existing) return m;
            return { ...m, reactions: [...m.reactions, { emoji, userId }] };
          })
        );
      }
    };

    const handleReactionRemoved = ({ messageId, conversationId: eventConvId, emoji, userId }) => {
      if (eventConvId === cid) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id !== messageId) return m;
            return {
              ...m,
              reactions: m.reactions.filter(
                (r) => !(r.emoji === emoji && r.userId.toString() === userId)
              ),
            };
          })
        );
      }
    };

    const handleReceiptUpdate = ({ conversationId: eventConvId, receipts }) => {
      if (eventConvId === cid) {
        useSocketStore.getState().syncReceiptState({ [eventConvId]: receipts });
      }
    };

    socket.on(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleDeletedMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, handleMessageDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
    socket.on(SOCKET_EVENTS.MESSAGE_EDITED, handleMessageEdited);
    socket.on(SOCKET_EVENTS.MESSAGE_PINNED, handleMessagePinned);
    socket.on(SOCKET_EVENTS.MESSAGE_UNPINNED, handleMessageUnpinned);
    socket.on(SOCKET_EVENTS.MESSAGE_REACTION_ADDED, handleReactionAdded);
    socket.on(SOCKET_EVENTS.MESSAGE_REACTION_REMOVED, handleReactionRemoved);
    socket.on(SOCKET_EVENTS.RECEIPT_UPDATE, handleReceiptUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleDeletedMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_DELIVERED, handleMessageDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE_READ, handleMessageRead);
      socket.off(SOCKET_EVENTS.MESSAGE_EDITED, handleMessageEdited);
      socket.off(SOCKET_EVENTS.MESSAGE_PINNED, handleMessagePinned);
      socket.off(SOCKET_EVENTS.MESSAGE_UNPINNED, handleMessageUnpinned);
      socket.off(SOCKET_EVENTS.MESSAGE_REACTION_ADDED, handleReactionAdded);
      socket.off(SOCKET_EVENTS.MESSAGE_REACTION_REMOVED, handleReactionRemoved);
      socket.off(SOCKET_EVENTS.RECEIPT_UPDATE, handleReceiptUpdate);
      socket.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, { conversationId: cid });
    };
  }, [checkIfNearBottom, scrollToBottom]);

  const handleLoadEarlier = useCallback(async () => {
    const cid = conversationIdRef.current;
    if (!pagination.nextCursor || loadingMore || !cid) return;
    setLoadingMore(true);
    setLoadError(null);

    const wasNearBottom = checkIfNearBottom();
    prevScrollHeightRef.current = containerRef.current?.scrollHeight || 0;

    try {
      const res = await getMessageHistoryRequest(cid, {
        cursor: pagination.nextCursor,
        limit: PAGE_SIZE,
      });
      const earlierMessages = res.data.messages || [];

      setMessages((prev) => [...earlierMessages, ...prev]);
      setPagination(res.data.pagination || { hasNextPage: false, nextCursor: null });

      if (wasNearBottom) {
        requestAnimationFrame(() => scrollToBottom('auto'));
      } else if (containerRef.current && prevScrollHeightRef.current > 0) {
        const newScrollHeight = containerRef.current.scrollHeight;
        const scrollOffset = newScrollHeight - prevScrollHeightRef.current;
        containerRef.current.scrollTop += scrollOffset;
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load earlier messages');
      addToast({ message: err.message || 'Failed to load earlier messages', type: 'error' });
    } finally {
      setLoadingMore(false);
    }
  }, [pagination.nextCursor, loadingMore, checkIfNearBottom, scrollToBottom, addToast]);

  const handleSendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const cid = conversationIdRef.current;
    if (!cid) return;

    const content = inputText.trim();
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    const tempId = `temp-${Date.now()}`;

    setInputText('');
    setSending(true);
    setReplyingTo(null);

    const socket = socketClientManager.getSocket();
    if (socket) {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: cid });
    }

    const optimisticMsg = {
      _id: tempId,
      content,
      senderId: { _id: currentUser?._id, username: currentUser?.username, displayName: currentUser?.displayName, avatarUrl: currentUser?.avatarUrl },
      conversationId: cid,
      status: 'sending',
      createdAt: new Date().toISOString(),
      isDeleted: false,
      idempotencyKey,
      replyTo: replyingTo?._id || null,
      reactions: [],
      isEdited: false,
      isPinned: false,
    };

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom('auto');

    try {
      const res = await sendMessageRequest({
        conversationId: cid,
        content,
        idempotencyKey,
        replyTo: replyingTo?._id || null,
      });

      const newMsg = res.data.message;
      setMessages((prev) => prev.map((m) => (m._id === tempId ? newMsg : m)));
      setOptimisticMessages((prev) => prev.filter((m) => m._id !== tempId));
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setOptimisticMessages((prev) => prev.filter((m) => m._id !== tempId));
      setFailedMessages((prev) => [...prev, { content, idempotencyKey, error: err.message || 'Failed to send' }]);
      addToast({ message: 'Message failed to send. Tap to retry.', type: 'error' });
      setInputText(content);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, currentUser, scrollToBottom, addToast, replyingTo]);

  const handleRetryMessage = useCallback(async (failedMsg) => {
    const cid = conversationIdRef.current;
    if (!cid) return;

    setFailedMessages((prev) => prev.filter((m) => m.idempotencyKey !== failedMsg.idempotencyKey));
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      content: failedMsg.content,
      senderId: { _id: currentUser?._id, username: currentUser?.username, displayName: currentUser?.displayName, avatarUrl: currentUser?.avatarUrl },
      conversationId: cid,
      status: 'sending',
      createdAt: new Date().toISOString(),
      isDeleted: false,
      idempotencyKey: failedMsg.idempotencyKey,
      replyTo: replyingTo?._id || null,
      reactions: [],
      isEdited: false,
      isPinned: false,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom('auto');

    try {
      const res = await sendMessageRequest({
        conversationId: cid,
        content: failedMsg.content,
        idempotencyKey: failedMsg.idempotencyKey,
        replyTo: replyingTo?._id || null,
      });

      const newMsg = res.data.message;
      setMessages((prev) => prev.map((m) => (m._id === tempId ? newMsg : m)));
      setOptimisticMessages((prev) => prev.filter((m) => m._id !== tempId));
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      setOptimisticMessages((prev) => prev.filter((m) => m._id !== tempId));
      setFailedMessages((prev) => [...prev, { content: failedMsg.content, idempotencyKey: failedMsg.idempotencyKey, error: err.message || 'Failed to send' }]);
      addToast({ message: 'Message failed to send again.', type: 'error' });
    } finally {
      setSending(false);
    }
  }, [currentUser, scrollToBottom, addToast, replyingTo]);

  const handleEditMessage = useCallback(async (messageId, newContent) => {
    const cid = conversationIdRef.current;
    if (!cid) return;

    const previousContent = messages.find((m) => m._id === messageId)?.content;

    setMessages((prev) =>
      prev.map((m) =>
        m._id === messageId ? { ...m, content: newContent, isEdited: true } : m
      )
    );

    try {
      await editMessageRequest(messageId, { content: newContent });
      addToast({ message: 'Message edited', type: 'info' });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, content: previousContent, isEdited: false } : m
        )
      );
      addToast({ message: err.message || 'Failed to edit message', type: 'error' });
    }
  }, [messages, addToast]);

  const handleDeleteMessage = useCallback(async (messageId) => {
    const cid = conversationIdRef.current;
    if (!cid) return;

    const previousMessage = messages.find((m) => m._id === messageId);

    setMessages((prev) =>
      prev.map((m) =>
        m._id === messageId
          ? { ...m, isDeleted: true, content: '[This message was deleted]', attachments: [] }
          : m
      )
    );

    try {
      await deleteMessageRequest(messageId);
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? previousMessage : m))
      );
      addToast({ message: err.message || 'Failed to delete message', type: 'error' });
    }
  }, [messages, addToast]);

  const handleDeleteForEveryone = useCallback(async (messageId) => {
    const cid = conversationIdRef.current;
    if (!cid) return;

    const previousMessage = messages.find((m) => m._id === messageId);

    setMessages((prev) =>
      prev.map((m) =>
        m._id === messageId
          ? { ...m, isDeleted: true, content: '[This message was deleted]', attachments: [] }
          : m
      )
    );

    try {
      await deleteMessageForEveryoneRequest(messageId);
      addToast({ message: 'Message deleted for everyone', type: 'info' });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? previousMessage : m))
      );
      addToast({ message: err.message || 'Failed to delete message for everyone', type: 'error' });
    }
  }, [messages, addToast]);

  const handlePinMessage = useCallback(async (messageId) => {
    const cid = conversationIdRef.current;
    if (!cid) return;

    const previousMessage = messages.find((m) => m._id === messageId);

    setMessages((prev) =>
      prev.map((m) => (m._id === messageId ? { ...m, isPinned: true } : m))
    );

    try {
      await pinMessageRequest(messageId);
      addToast({ message: 'Message pinned', type: 'info' });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? previousMessage : m))
      );
      addToast({ message: err.message || 'Failed to pin message', type: 'error' });
    }
  }, [messages, addToast]);

  const handleUnpinMessage = useCallback(async (messageId) => {
    const cid = conversationIdRef.current;
    if (!cid) return;

    const previousMessage = messages.find((m) => m._id === messageId);

    setMessages((prev) =>
      prev.map((m) => (m._id === messageId ? { ...m, isPinned: false } : m))
    );

    try {
      await unpinMessageRequest(messageId);
      addToast({ message: 'Message unpinned', type: 'info' });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? previousMessage : m))
      );
      addToast({ message: err.message || 'Failed to unpin message', type: 'error' });
    }
  }, [messages, addToast]);

  const handleAddReaction = useCallback(async (messageId, emoji) => {
    const cid = conversationIdRef.current;
    if (!cid) return;

    const previousReactions = messages.find((m) => m._id === messageId)?.reactions || [];

    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== messageId) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji && r.userId.toString() === currentUser?._id);
        if (existing) {
          return {
            ...m,
            reactions: m.reactions.filter((r) => !(r.emoji === emoji && r.userId.toString() === currentUser?._id)),
          };
        }
        return { ...m, reactions: [...m.reactions, { emoji, userId: currentUser?._id }] };
      })
    );

    try {
      await addReactionRequest(messageId, { emoji });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions: previousReactions } : m))
      );
      addToast({ message: err.message || 'Failed to add reaction', type: 'error' });
    }
  }, [messages, currentUser, addToast]);

  const handleRemoveReaction = useCallback(async (messageId, emoji) => {
    const cid = conversationIdRef.current;
    if (!cid) return;

    const previousReactions = messages.find((m) => m._id === messageId)?.reactions || [];

    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== messageId) return m;
        return {
          ...m,
          reactions: m.reactions.filter((r) => !(r.emoji === emoji && r.userId.toString() === currentUser?._id)),
        };
      })
    );

    try {
      await removeReactionRequest(messageId, { emoji });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions: previousReactions } : m))
      );
      addToast({ message: err.message || 'Failed to remove reaction', type: 'error' });
    }
  }, [messages, currentUser, addToast]);

  const handleInputChange = useCallback((e) => {
    setInputText(e.target.value);
    const socket = socketClientManager.getSocket();
    const cid = conversationIdRef.current;

    if (socket && cid) {
      socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId: cid });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: cid });
      }, TYPING_TIMEOUT_MS);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;
    isNearBottomRef.current = scrollTop + containerRef.current.clientHeight >= (containerRef.current.scrollHeight - SCROLL_THRESHOLD);
  }, []);

  const handleRetryFailed = useCallback((idempotencyKey) => {
    const failed = failedMessages.find((m) => m.idempotencyKey === idempotencyKey);
    if (failed) {
      handleRetryMessage(failed);
    }
  }, [failedMessages, handleRetryMessage]);

  const formatDateSeparator = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }, []);

  const formatTime = useCallback((timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getRecipient = useCallback(() => {
    if (!conversation) return { username: 'User', displayName: 'User', status: 'offline', lastSeen: null };
    const otherMember = conversation.members?.find(
      (m) => (m.userId._id || m.userId).toString() !== currentUser?._id
    );
    return otherMember?.userId || { username: 'User', displayName: 'User', status: 'offline', lastSeen: null };
  }, [conversation, currentUser]);

  const formatLastSeen = useCallback((lastSeen) => {
    if (!lastSeen) return 'Offline';
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Online';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    return `Last seen ${lastSeenDate.toLocaleDateString()}`;
  }, []);

  const getMessageReactions = useCallback((message) => {
    if (!message?.reactions) return [];
    const reactionMap = {};
    message.reactions.forEach((r) => {
      if (!reactionMap[r.emoji]) {
        reactionMap[r.emoji] = { emoji: r.emoji, count: 0, userReacted: false };
      }
      reactionMap[r.emoji].count++;
      if (r.userId.toString() === currentUser?._id) {
        reactionMap[r.emoji].userReacted = true;
      }
    });
    return Object.values(reactionMap);
  }, [currentUser]);

  return {
    conversation,
    messages,
    loading,
    error,
    inputText,
    sending,
    pagination,
    loadingMore,
    loadError,
    failedMessages,
    optimisticMessages,
    typingUsers,
    currentUser,
    messagesEndRef,
    containerRef,
    scrollToBottom,
    checkIfNearBottom,
    handleLoadEarlier,
    handleSendMessage,
    handleRetryMessage,
    handleRetryFailed,
    handleEditMessage,
    handleDeleteMessage,
    handleDeleteForEveryone,
    handlePinMessage,
    handleUnpinMessage,
    handleAddReaction,
    handleRemoveReaction,
    handleInputChange,
    handleScroll,
    getRecipient,
    formatDateSeparator,
    formatTime,
    formatLastSeen,
    setInputText,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    getMessageReactions,
  };
}