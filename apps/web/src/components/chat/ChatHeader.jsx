import { Users, Phone, Video, MoreVertical } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';

export function ChatHeader({ conversation, recipient, formatLastSeen }) {
  const isDirect = conversation?.type === 'direct';
  const isGroup = conversation?.type === 'group' || conversation?.type === 'channel';

  const headerTitle = isDirect
    ? recipient?.displayName || recipient?.username || 'Direct Message'
    : conversation?.name || 'Conversation';

  const headerSubtitle = isDirect
    ? formatLastSeen(recipient?.lastSeen)
    : `${conversation?.members?.length || 0} members`;

  const headerStatus = isDirect
    ? (recipient?.status || 'offline')
    : null;

  return (
    <div className="h-14 px-4 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-3 min-w-0">
        <Avatar
          name={headerTitle}
          src={recipient?.avatarUrl}
          status={headerStatus}
          size="md"
        />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white tracking-tight truncate">
            {headerTitle}
          </h2>
          <p className="text-[10px] text-zinc-400 truncate">
            {isDirect && headerStatus ? (
              <span className="capitalize">{headerStatus}</span>
            ) : (
              headerSubtitle
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        {isDirect && (
          <>
            <Button variant="ghost" size="sm" className="p-2" title="Voice call">
              <Phone className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="p-2" title="Video call">
              <Video className="w-4 h-4" />
            </Button>
          </>
        )}
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" className="p-2" title="More options">
              <MoreVertical className="w-4 h-4" />
            </Button>
          }
          items={[
            { label: 'View Profile', icon: null },
            { label: 'Mute Notifications', icon: null },
            { label: 'Conversation Settings', icon: null },
          ]}
        />
      </div>
    </div>
  );
}