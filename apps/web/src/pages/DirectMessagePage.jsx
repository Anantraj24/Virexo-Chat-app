import { useParams } from 'react';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { MessageSquare } from 'lucide-react';

export function DirectMessagePage() {
  const { id } = useParams();
  const name = id ? id.charAt(0).toUpperCase() + id.slice(1) : 'User';

  return (
    <div className="h-full flex flex-col justify-between">
      {/* DM Header */}
      <div className="border-b border-zinc-800/80 pb-4 mb-4 flex items-center space-x-3">
        <Avatar name={name} status="online" size="sm" />
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">{name}</h2>
          <p className="text-[10px] text-emerald-400 font-medium">Online</p>
        </div>
      </div>

      {/* Message Log Placeholder */}
      <div className="flex-1 overflow-y-auto">
        <EmptyState
          icon={<MessageSquare className="w-6 h-6 text-indigo-400" />}
          title={`Direct message history with ${name}`}
          description="Send 1-on-1 direct messages, images, and files in real-time."
        />
      </div>

      {/* Input Message Box Placeholder */}
      <div className="pt-4 border-t border-zinc-800/80 mt-4">
        <input
          type="text"
          placeholder={`Message @${name}...`}
          disabled
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-600 disabled:opacity-60 cursor-not-allowed"
        />
      </div>
    </div>
  );
}
