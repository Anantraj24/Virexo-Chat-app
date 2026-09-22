import { Phone, Video, Search, MoreHorizontal, Sparkles, PanelRight } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';

export function ChatHeader({ 
  conversation, 
  recipient, 
  formatLastSeen, 
  onReportUser, 
  onReportConversation,
  onToggleDetails,
  detailsOpen
}) {
  const isDirect = conversation?.type === 'direct';

  const headerTitle = isDirect
    ? recipient?.displayName || recipient?.username || 'Matthew Anderson'
    : conversation?.name || 'Virexo Community';

  const headerSubtitle = isDirect
    ? (recipient?.lastSeen ? formatLastSeen(recipient.lastSeen) : 'last seen recently')
    : `${conversation?.members?.length || 2} members`;

  const headerStatus = isDirect ? (recipient?.status || 'online') : null;

  return (
    <div className="h-16 px-6 border-b border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
      {/* Contact Info */}
      <div className="flex items-center space-x-3.5 min-w-0">
        <div className="relative">
          <Avatar
            name={headerTitle}
            src={recipient?.avatarUrl}
            status={headerStatus}
            size="md"
            className="w-10 h-10"
          />
          {/* Platform indicator badge matching reference UI */}
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#25D366] border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[8px] text-white">
            💬
          </div>
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 tracking-tight truncate">
            {headerTitle}
          </h2>
          <p className="text-xs text-slate-400 dark:text-zinc-400 truncate flex items-center space-x-1.5">
            <span>{headerSubtitle}</span>
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-1 text-slate-500 dark:text-zinc-400">
        <button
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-indigo-600 transition cursor-pointer"
          title="AI Assistant"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <button
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100 transition cursor-pointer"
          title="Voice call"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100 transition cursor-pointer"
          title="Video call"
        >
          <Video className="w-4 h-4" />
        </button>

        <button
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100 transition cursor-pointer"
          title="Search conversation"
        >
          <Search className="w-4 h-4" />
        </button>

        <Dropdown
          trigger={
            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100 transition cursor-pointer" title="More options">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
          items={[
            { label: 'View Profile', onClick: onToggleDetails },
            { label: 'Mute Notifications', icon: null },
            { label: 'Export Chat', icon: null },
            isDirect && onReportUser ? { label: 'Report User', danger: true, onClick: onReportUser } : null,
            !isDirect && onReportConversation ? { label: 'Report Conversation', danger: true, onClick: onReportConversation } : null,
          ].filter(Boolean)}
        />

        {onToggleDetails && (
          <button
            onClick={onToggleDetails}
            className={`p-2 rounded-lg transition cursor-pointer ${
              detailsOpen 
                ? 'bg-slate-100 dark:bg-zinc-800 text-indigo-600' 
                : 'hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
            title="Toggle Contact Details"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}