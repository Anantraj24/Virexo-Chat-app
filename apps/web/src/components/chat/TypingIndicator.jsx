import { useEffect, useState } from 'react';

export function TypingIndicator({ typingUsers }) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    if (typingUsers.length === 0) {
      setDisplayText('');
      return;
    }

    const names = typingUsers;
    let text;
    if (names.length === 1) {
      text = `${names[0]} is typing...`;
    } else if (names.length === 2) {
      text = `${names[0]} and ${names[1]} are typing...`;
    } else {
      text = `${names[0]} and others are typing...`;
    }

    setDisplayText(text);
  }, [typingUsers]);

  if (!displayText) return null;

  return (
    <div className="px-2 py-1 text-[11px] text-indigo-400 animate-pulse flex items-center space-x-1">
      <span>{displayText}</span>
      <span className="flex space-x-0.5">
        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}