export function TypingIndicator({ typingUsers = [] }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  let text;
  if (typingUsers.length === 1) {
    text = `${typingUsers[0]} is typing...`;
  } else if (typingUsers.length === 2) {
    text = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
  } else {
    text = `${typingUsers[0]} and others are typing...`;
  }

  return (
    <div className="px-6 py-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium animate-pulse flex items-center space-x-1.5 bg-slate-50/60 dark:bg-zinc-800/40 border-t border-slate-100 dark:border-zinc-800/60">
      <span>{text}</span>
      <span className="flex space-x-0.5">
        <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}