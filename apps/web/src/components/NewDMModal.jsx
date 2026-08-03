import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Spinner } from './ui/Spinner';
import { searchUsersRequest } from '../api/userApi';
import { createDirectRequest } from '../api/conversationApi';
import { useToast } from './ui/Toast';
import { Search, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NewDMModal({ isOpen, onClose, onConversationCreated }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedUser(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      searchUsersRequest(query)
        .then((res) => {
          setResults(res.data.users || []);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleStartDM = async () => {
    if (!selectedUser) return;
    setStarting(true);

    try {
      const res = await createDirectRequest({ recipientId: selectedUser._id });
      const conversation = res.data.conversation;

      addToast({ message: `Direct message started with ${selectedUser.username}`, type: 'success' });
      if (onConversationCreated) onConversationCreated(conversation);
      onClose();
      navigate(`/dms/${conversation._id}`);
    } catch (err) {
      addToast({ message: err.message || 'Failed to start direct message', type: 'error' });
    } finally {
      setStarting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Direct Message"
      description="Search for a community member to start a 1-on-1 private chat."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isDisabled={!selectedUser}
            isLoading={starting}
            onClick={handleStartDM}
            leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
          >
            Start Chat
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          placeholder="Search by username or display name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          autoFocus
        />

        {/* Results List */}
        <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
          {loading ? (
            <div className="py-6 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          ) : results.length > 0 ? (
            results.map((user) => (
              <div
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`p-2.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition ${
                  selectedUser?._id === user._id
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Avatar name={user.displayName || user.username} src={user.avatarUrl} status={user.status} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{user.displayName || user.username}</div>
                  <div className="text-[10px] text-zinc-500 truncate">@{user.username}</div>
                </div>
              </div>
            ))
          ) : query.trim() ? (
            <div className="py-6 text-center text-xs text-zinc-500">No users found matching &quot;{query}&quot;</div>
          ) : (
            <div className="py-6 text-center text-xs text-zinc-500">Type a name to search users</div>
          )}
        </div>
      </div>
    </Modal>
  );
}
