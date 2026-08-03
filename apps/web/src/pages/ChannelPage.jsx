import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react';
import { Hash, Users, MessageSquare, Send, Trash2, ArrowUp, Check, CheckCheck } from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { getConversationRequest } from '../api/conversationApi';
import { sendMessageRequest, getMessageHistoryRequest, deleteMessageRequest, markReadRequest } from '../api/messageApi';
import { useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import { socketClientManager } from '../lib/socketClient';
import { SOCKET_EVENTS } from '@virexo/shared';
import { useToast } from '../components/ui/Toast';

export function ChannelPage() {
  const { id } = useParams();
  const { user: currentUser } = useAuthStore();
  const { addToast } = useToast();
  const typingUsers = useSocketStore((state) => state.getTypingUsersForConversation(id));

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const [pagination, setPagination] = useState({ hasNextPage: false, nextCursor: null });
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChannelData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const [convRes, historyRes] = await Promise.all([
        getConversationRequest(id),
        getMessageHistoryRequest(id, { limit: 50 }),
      ]);

      setConversation(convRes.data.conversation);
      setMessages(historyRes.data.messages || []);
      setPagination(historyRes.data.pagination || {});

      markReadRequest(id).catch(() => {});

      // Connect socket & join conversation room
      const socket = socketClientManager.connect();
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId: id });
        socket.emit(SOCKET_EVENTS.MESSAGE_READ, { conversationId: id });
      }
    } catch (err) {
      addToast({ message: err.message || 'Failed to load channel messages', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    loadChannelData();

    // Listen for real-time socket events
    const socket = socketClientManager.getSocket();
    if (socket) {
      const handleNewMessage = ({ message, conversationId }) => {
        if (conversationId === id) {
          setMessages((prev) => [...prev, message]);
          socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { conversationId: id, messageId: message._id });
          socket.emit(SOCKET_EVENTS.MESSAGE_READ, { conversationId: id });
          setTimeout(scrollToBottom, 50);
        }
      };

      const handleDeletedMessage = ({ messageId, conversationId }) => {
        if (conversationId === id) {
          setMessages((prev) =>
            prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, content: '[This message was deleted]', attachments: [] } : m))
          );
        }
      };

      socket.on(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
      socket.on(SOCKET_EVENTS.MESSAGE_DELETED, handleDeletedMessage);

      return () => {
        socket.off(SOCKET_EVENTS.MESSAGE_NEW, handleNewMessage);
        socket.off(SOCKET_EVENTS.MESSAGE_DELETED, handleDeletedMessage);
        socket.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, { conversationId: id });
      };
    }
  }, [id, loadChannelData]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [loading, messages.length]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    const socket = socketClientManager.getSocket();

    if (socket && id) {
      socket.emit(SOCKET_EVENTS.TYPING_START, { conversationId: id });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: id });
      }, 2000);
    }
  };

  const handleLoadEarlier = async () => {
    if (!pagination.nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const res = await getMessageHistoryRequest(id, { cursor: pagination.nextCursor, limit: 50 });
      const earlierMessages = res.data.messages || [];

      setMessages((prev) => [...earlierMessages, ...prev]);
      setPagination(res.data.pagination || {});
    } catch (err) {
      addToast({ message: err.message || 'Failed to load earlier messages', type: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const content = inputText.trim();
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    setInputText('');
    setSending(true);

    const socket = socketClientManager.getSocket();
    if (socket) {
      socket.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId: id });
    }

    try {
      const res = await sendMessageRequest({
        conversationId: id,
        content,
        idempotencyKey,
      });

      const newMsg = res.data.message;
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      addToast({ message: err.message || 'Failed to send message', type: 'error' });
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      const res = await deleteMessageRequest(msgId);
      const updatedMsg = res.data.message;

      setMessages((prev) =>
        prev.map((m) => (m._id === msgId ? updatedMsg : m))
      );
      addToast({ message: 'Message deleted', type: 'info' });
    } catch (err) {
      addToast({ message: err.message || 'Failed to delete message', type: 'error' });
    }
  };

  const renderStatusTicks = (status) => {
    if (status === 'read') {
      return <CheckCheck className="w-3.5 h-3.5 text-sky-400" title="Read" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="w-3.5 h-3.5 text-zinc-400" title="Delivered" />;
    }
    return <Check className="w-3.5 h-3.5 text-zinc-500" title="Sent" />;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-between max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-3 mb-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {conversation?.name || 'Channel'}
            </h2>
            {conversation?.description && (
              <p className="text-xs text-zinc-400 font-normal">{conversation.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>{conversation?.members?.length || 0} Members</span>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 p-2">
        {pagination.hasNextPage && (
          <div className="flex justify-center py-2">
            <Button
              variant="outline"
              size="sm"
              isLoading={loadingMore}
              onClick={handleLoadEarlier}
              leftIcon={<ArrowUp className="w-3.5 h-3.5" />}
            >
              Load Earlier Messages
            </Button>
          </div>
        )}

        {messages.length > 0 ? (
          messages.map((msg) => {
            const sender = msg.senderId || { username: 'Unknown', displayName: 'Unknown' };
            const isSelf = sender._id === currentUser?._id;
            const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div
                key={msg._id}
                className="group flex items-start space-x-3 p-2 rounded-xl hover:bg-zinc-900/50 transition"
              >
                <Avatar name={sender.displayName || sender.username} src={sender.avatarUrl} size="md" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-zinc-100">{sender.displayName || sender.username}</span>
                    <span className="text-[10px] text-zinc-500">{timeStr}</span>
                    {isSelf && !msg.isDeleted && renderStatusTicks(msg.status || 'sent')}
                  </div>

                  <div className={`text-xs mt-1 leading-relaxed ${msg.isDeleted ? 'italic text-zinc-500' : 'text-zinc-300'}`}>
                    {msg.content}
                  </div>
                </div>

                {isSelf && !msg.isDeleted && (
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-indigo-400 mx-auto opacity-60" />
            <h3 className="text-sm font-bold text-white">Welcome to #{conversation?.name || 'this channel'}!</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              This is the start of the message timeline. Send a message to start the conversation.
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-2 py-1 text-[11px] text-indigo-400 animate-pulse">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Input Message Box */}
      <form onSubmit={handleSendMessage} className="pt-3 border-t border-zinc-800/80 mt-2 flex items-center space-x-2 shrink-0">
        <input
          type="text"
          placeholder={`Message #${conversation?.name || 'channel'}...`}
          value={inputText}
          onChange={handleInputChange}
          disabled={sending}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          isDisabled={!inputText.trim()}
          isLoading={sending}
          leftIcon={<Send className="w-4 h-4" />}
        >
          Send
        </Button>
      </form>
    </div>
  );
}
