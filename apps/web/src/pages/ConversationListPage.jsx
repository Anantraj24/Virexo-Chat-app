import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/ui/Toast';
import { listConversationsRequest } from '../api/conversationApi';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Hash, MessageSquare, Plus, Search, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export function ConversationListPage() {
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listConversationsRequest({ limit: 50 });
      setConversations(res.data.conversations || []);
    } catch {
      addToast({ message: 'Failed to load conversations', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const channels = conversations.filter((c) => c.type === 'group' || c.type === 'channel');
  const directMessages = conversations.filter((c) => c.type === 'direct');

  const getDMRecipient = (conv) => {
    const otherMember = conv.members?.find((m) => (m.userId._id || m.userId).toString() !== user?._id);
    return otherMember?.userId || { username: 'Unknown User', displayName: 'Unknown User' };
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

  const filteredChannels = filteredConversations.filter((c) => c.type === 'group' || c.type === 'channel');
  const filteredDMs = filteredConversations.filter((c) => c.type === 'direct');

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <div className="h-14 px-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-zinc-200">Messages</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" className="p-2" onClick={() => navigate('/settings')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
        </div>
      </div>

      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 text-xs text-zinc-200 placeholder-zinc-500 pl-9 pr-3 py-2 rounded-lg border border-zinc-800 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                  <div className="h-2 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {filteredChannels.length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Channels</div>
                <nav className="space-y-0.5">
                  {filteredChannels.map((channel) => (
                    <button
                      key={channel._id}
                      onClick={() => navigate(`/channels/${channel._id}`)}
                      className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition"
                    >
                      <Hash className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate flex-1">{channel.name}</span>
                    </button>
                  ))}
                </nav>
              </div>
            )}

            {filteredDMs.length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Direct Messages</div>
                <nav className="space-y-0.5">
                  {filteredDMs.map((dm) => {
                    const recipient = getDMRecipient(dm);
                    return (
                      <button
                        key={dm._id}
                        onClick={() => navigate(`/dms/${dm._id}`)}
                        className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200 transition"
                      >
                        <Avatar name={recipient.displayName || recipient.username} src={recipient.avatarUrl} size="sm" status={recipient.status} />
                        <span className="truncate flex-1">{recipient.displayName || recipient.username}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

            {filteredConversations.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-xs text-zinc-500">No conversations yet</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}