import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  SquarePen, 
  Search, 
  ArrowUpDown, 
  Paperclip, 
  Star,
  ChevronDown 
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useSocketStore } from '../../store/useSocketStore';
import { cn } from '../../lib/utils';

export function ConversationList({ 
  conversations = [], 
  currentUserId, 
  loading, 
  onNewChat 
}) {
  const unreadCounts = useSocketStore((state) => state.unreadCounts);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('Newest');

  const getDMRecipient = (conv) => {
    const otherMember = conv.members?.find((m) => {
      const mUserId = m.user?.id || (typeof m.userId === 'object' ? m.userId?.id : m.userId);
      return mUserId?.toString() !== currentUserId?.toString();
    });
    return (
      otherMember?.user ||
      (typeof otherMember?.userId === 'object' ? otherMember?.userId : null) ||
      { username: 'Matthew Anderson', displayName: 'Matthew Anderson' }
    );
  };

  // Preset demo conversations matching the user's reference screenshot
  const mockConversations = [
    {
      id: 'mock-1',
      name: 'Matthew Anderson',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      platform: 'whatsapp',
      platformColor: '#25D366',
      snippet: "Hey there! 👋 I'm new here and I'm really interested ...",
      time: '5m ago',
      hasAttachment: true,
      isStarred: true,
    },
    {
      id: 'mock-2',
      name: 'Ethan Johnson',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      platform: 'messenger',
      platformColor: '#A855F7',
      snippet: 'Hi, John! I hope this message finds you well.',
      time: '15m ago',
      hasAttachment: true,
      isStarred: false,
    },
    {
      id: 'mock-3',
      name: 'Benjamin Lee',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
      platform: 'whatsapp',
      platformColor: '#25D366',
      snippet: 'Hello! 👋 Thank you for the productive meeting today.',
      time: '1h ago',
      hasAttachment: true,
      isStarred: false,
    },
    {
      id: 'mock-4',
      name: 'Esther Howard',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      platform: 'whatsapp',
      platformColor: '#25D366',
      snippet: 'Yes, I saw your message. I\'m writing to provide the ...',
      time: '3h ago',
      hasAttachment: true,
      isStarred: false,
    },
    {
      id: 'mock-5',
      name: 'Sophia Rodriguez',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
      platform: 'telegram',
      platformColor: '#0088CC',
      snippet: 'Hey there! 👋 I\'m currently working on Project Y...',
      time: '5h ago',
      hasAttachment: false,
      isStarred: false,
    },
    {
      id: 'mock-6',
      name: 'Leslie Alexander',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
      platform: 'whatsapp',
      platformColor: '#25D366',
      snippet: 'Hi! Please be informed that a new policy regarding ...',
      time: '10h ago',
      hasAttachment: false,
      isStarred: false,
    },
    {
      id: 'mock-7',
      name: 'Chloe Patel',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100',
      platform: 'messenger',
      platformColor: '#A855F7',
      snippet: 'Hey there! This is a friendly reminder that the deadline ...',
      time: '15h ago',
      hasAttachment: true,
      isStarred: false,
    }
  ];

  // Map real database conversations
  const mappedRealConversations = conversations.map((conv) => {
    const isDirect = conv.type === 'direct';
    const recipient = isDirect ? getDMRecipient(conv) : null;
    const name = isDirect ? (recipient.displayName || recipient.username) : conv.name;
    const unread = unreadCounts[conv.id] || 0;

    return {
      id: conv.id,
      isReal: true,
      type: conv.type,
      name,
      avatarUrl: recipient?.avatarUrl,
      platform: 'whatsapp',
      platformColor: '#25D366',
      snippet: conv.lastMessage?.content || 'No messages yet',
      time: 'Active',
      unread,
      hasAttachment: false,
      isStarred: false,
      route: isDirect ? `/dms/${conv.id}` : `/channels/${conv.id}`,
    };
  });

  // Combine real and reference list
  const allList = mappedRealConversations.length > 0 
    ? [...mappedRealConversations, ...mockConversations.filter(m => !mappedRealConversations.some(r => r.name?.toLowerCase() === m.name?.toLowerCase()))]
    : mockConversations;

  const filtered = allList.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.name?.toLowerCase().includes(q) || item.snippet?.toLowerCase().includes(q);
  });

  return (
    <div className="w-80 border-r border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex flex-col h-full shrink-0">
      {/* Messages Header */}
      <div className="p-4 pb-2 border-b border-slate-100 dark:border-zinc-800/60">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
            Messages
          </h2>
          <button
            onClick={onNewChat}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Compose message"
          >
            <SquarePen className="w-4 h-4" />
          </button>
        </div>

        {/* Search Message Input */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search message"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-800/60 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Sort Filter Row */}
        <div className="flex items-center justify-end pb-1">
          <button className="flex items-center space-x-1 text-xs text-slate-600 dark:text-zinc-400 font-medium hover:text-slate-900 dark:hover:text-zinc-200 transition">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <span>{sortOrder}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-24 bg-slate-100 dark:bg-zinc-800 rounded" />
                  <div className="h-2.5 w-36 bg-slate-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.map((item) => {
          const destination = item.route || (mappedRealConversations[0]?.route || '/');

          return (
            <NavLink
              key={item.id}
              to={destination}
              className={({ isActive }) =>
                cn(
                  'group flex items-start space-x-3 p-3 rounded-2xl transition cursor-pointer text-left',
                  isActive
                    ? 'bg-blue-50/80 dark:bg-zinc-800/80 border border-blue-200/70 dark:border-zinc-700/80 shadow-2xs'
                    : 'hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 border border-transparent'
                )
              }
            >
              {/* Avatar with Platform Badge */}
              <div className="relative shrink-0">
                <Avatar
                  name={item.name}
                  src={item.avatarUrl}
                  size="md"
                  className="w-10 h-10"
                />
                <div 
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[7px] text-white"
                  style={{ backgroundColor: item.platformColor || '#25D366' }}
                >
                  💬
                </div>
              </div>

              {/* Info & Snippet */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate group-hover:text-slate-900">
                    {item.name}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    {item.hasAttachment && <Paperclip className="w-3 h-3 text-slate-400" />}
                    {item.isStarred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                  <p className="truncate flex-1 pr-2">
                    {item.snippet}
                  </p>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {item.time}
                  </span>
                </div>
              </div>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}