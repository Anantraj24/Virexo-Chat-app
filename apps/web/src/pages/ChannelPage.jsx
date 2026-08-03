import { useParams } from 'react';
import { Hash, Users, MessageSquare } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

export function ChannelPage() {
  const { id } = useParams();

  return (
    <div className="h-full flex flex-col justify-between">
      {/* Channel Header */}
      <div className="border-b border-zinc-800/80 pb-4 mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Hash className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-tight">#{id}</h2>
          <span className="text-xs text-zinc-500 font-normal">| Official channel</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <Users className="w-4 h-4" />
          <span>12 Members</span>
        </div>
      </div>

      {/* Message Feed Area Placeholder */}
      <div className="flex-1 overflow-y-auto space-y-4">
        <EmptyState
          icon={<MessageSquare className="w-6 h-6 text-indigo-400" />}
          title={`Welcome to #${id}!`}
          description="This is the start of the channel history. Real-time messaging will be enabled in Phase 6."
        />
      </div>

      {/* Input Message Box Placeholder */}
      <div className="pt-4 border-t border-zinc-800/80 mt-4">
        <input
          type="text"
          placeholder={`Message #${id}...`}
          disabled
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-600 disabled:opacity-60 cursor-not-allowed"
        />
      </div>
    </div>
  );
}
