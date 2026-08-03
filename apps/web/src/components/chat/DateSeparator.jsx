import { cn } from '../../lib/utils';

export function DateSeparator({ date }) {
  return (
    <div className="flex items-center justify-center py-3">
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-900/80 px-3 py-1 rounded-full border border-zinc-800">
        {date}
      </span>
    </div>
  );
}