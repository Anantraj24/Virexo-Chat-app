import { NavLink } from 'react-router-dom';
import { Hash, MessageSquare, Search } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useSocketStore } from '../../store/useSocketStore';
import { cn } from '../../lib/utils';

export function ConversationList({ conversations, currentUserId, loading, searchQuery }) {
  const unreadCounts = useSocketStore((state) => state.unreadCounts);

  const channels = conversations.filter((c) => c.type === 'group' || c.type === 'channel');
  const directMessages = conversations.filter((c) => c.type === 'direct');

  const getDMRecipient = (conv) => {
    const otherMember = conv.members?.find((m) => {
      const mUserId = m.user?.id || (typeof m.userId === 'object' ? m.userId?.id : m.userId);
      return mUserId?.toString() !== currentUserId?.toString();
    });
    return (
      otherMember?.user ||
      (typeof otherMember?.userId === 'object' ? otherMember?.userId : null) ||
      { username: 'Unknown User', displayName: 'Unknown User' }
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

  const filteredChannels = filteredConversations.filter((c) => c.type === 'group' || c.type === 'channel');
  const filteredDMs = filteredConversations.filter((c) => c.type === 'direct');

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
              const unread = unreadCounts[channel.id] || 0;
              return (
                <NavLink
                  key={channel.id}
                  to={`/channels/${channel.id}`}
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
              const unread = unreadCounts[dm.id] || 0;
              return (
                <NavLink
                  key={dm.id}
                  to={`/dms/${dm.id}`}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-[#2a3942] text-white border-l-4 border-[#00a884]'
                        : 'text-zinc-300 hover:bg-[#202c33]'
                    )
                  }
                >
                  <Avatar
                    name={recipient.displayName || recipient.username}
                    src={recipient.avatarUrl}
                    size="sm"
                    status={recipient.status}
                  />
                  <span className="truncate flex-1 font-normal text-zinc-200">
                    {recipient.displayName || recipient.username}
                  </span>
                  {unread > 0 && (
                    <span className="flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-bold text-white bg-[#00a884] rounded-full shrink-0 shadow-sm">
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