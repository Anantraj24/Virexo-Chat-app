import { NavLink } from 'react-router-dom';
import { Hash, MessageSquare, Search } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useSocketStore } from '../../store/useSocketStore';
import { cn } from '../../lib/utils';

export function ConversationList({ conversations, currentUserId, loading, searchQuery }) {
  const unreadCounts = useSocketStore((state) => state.unreadCounts);

  const channels = conversations.filter((c) => c.type === 'group' || c.type === 'channel');
  const directMessages = conversations.filter((c) => c.type === 'direct');

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    if (c.type === 'direct') {
      const otherMember = c.members?.find((m) => (m.userId._id || m.userId).toString() !== currentUserId);
      const name = otherMember?.userId?.displayName || otherMember?.userId?.username || '';
      return name.toLowerCase().includes(query);
    }
    return (c.name || '').toLowerCase().includes(query);
  });

  const filteredChannels = filteredConversations.filter((c) => c.type === 'group' || c.type === 'channel');
  const filteredDMs = filteredConversations.filter((c) => c.type === 'direct');

  const getDMRecipient = (conv) => {
    const otherMember = conv.members?.find((m) => (m.userId._id || m.userId).toString() !== currentUserId);
    return otherMember?.userId || { username: 'Unknown User', displayName: 'Unknown User' };
  };

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="space-y-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-3 p-2">
              <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filteredChannels.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Channels</div>
          <nav className="space-y-0.5">
            {filteredChannels.map((channel) => {
              const unread = unreadCounts[channel._id] || 0;
              return (
                <NavLink
                  key={channel._id}
                  to={`/channels/${channel._id}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition',
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    )
                  }
                >
                  <Hash className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate flex-1">{channel.name}</span>
                  {unread > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-indigo-600 rounded-full shrink-0">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}

      {filteredDMs.length > 0 && (
        <div className="px-3 pt-3 pb-1">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Direct Messages</div>
          <nav className="space-y-0.5">
            {filteredDMs.map((dm) => {
              const recipient = getDMRecipient(dm);
              const unread = unreadCounts[dm._id] || 0;
              return (
                <NavLink
                  key={dm._id}
                  to={`/dms/${dm._id}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center space-x-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition',
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    )
                  }
                >
                  <Avatar
                    name={recipient.displayName || recipient.username}
                    src={recipient.avatarUrl}
                    size="sm"
                    status={recipient.status}
                  />
                  <span className="truncate flex-1">
                    {recipient.displayName || recipient.username}
                  </span>
                  {unread > 0 && (
                    <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-indigo-600 rounded-full shrink-0">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </NavLink>
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
    </div>
  );
}