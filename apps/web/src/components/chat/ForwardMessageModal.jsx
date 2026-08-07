import { useState, useEffect } from 'react';
import { X, Search, Hash } from 'lucide-react';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { listConversationsRequest } from '../../api/conversationApi';
import { forwardMessageRequest } from '../../api/messageApi';
import { useToast } from '../ui/Toast';
import { useAuthStore } from '../../store/useAuthStore';
import { cn } from '../../lib/utils';

export function ForwardMessageModal({ isOpen, onClose, message }) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setLoading(true);
      listConversationsRequest({ limit: 50 })
        .then((res) => {
          setConversations(res.data.conversations || []);
        })
        .catch(() => {
          addToast({ message: 'Failed to load conversations', type: 'error' });
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, addToast]);

  if (!isOpen) return null;

  const getDMRecipient = (conv) => {
    const otherMember = conv.members?.find((m) => {
      const mUserId = m.user?.id || (typeof m.userId === 'object' ? m.userId?.id : m.userId);
      return mUserId?.toString() !== user?.id?.toString();
    });
    return (
      otherMember?.user ||
      (typeof otherMember?.userId === 'object' ? otherMember?.userId : null) ||
      { username: 'Unknown', displayName: 'Unknown' }
    );
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (c.type === 'direct') {
      const recipient = getDMRecipient(c);
      const name = recipient.displayName || recipient.username || '';
      return name.toLowerCase().includes(query);
    }
    return (c.name || '').toLowerCase().includes(query);
  });

  const handleForward = async (targetConversationId) => {
    if (!message) return;
    setForwarding(true);
    try {
      await forwardMessageRequest(message.id, { targetConversationId });
      addToast({ message: 'Message forwarded successfully', type: 'success' });
      onClose();
    } catch (err) {
      addToast({ message: err.message || 'Failed to forward message', type: 'error' });
    } finally {
      setForwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-100">Forward Message</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8 text-sm text-zinc-500">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-sm text-zinc-500">No conversations found</div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => {
                const isDM = conv.type === 'direct';
                const recipient = isDM ? getDMRecipient(conv) : null;
                const name = isDM ? (recipient.displayName || recipient.username) : conv.name;

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleForward(conv.id)}
                    disabled={forwarding}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800/50 transition group disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-3">
                      {isDM ? (
                        <Avatar
                          name={name}
                          src={recipient?.avatarUrl}
                          size="sm"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <Hash className="w-4 h-4" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-zinc-200 group-hover:text-white truncate">
                        {name}
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" isDisabled={forwarding}>
                      Send
                    </Button>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
