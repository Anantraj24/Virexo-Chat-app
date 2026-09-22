import { useRef, useEffect, useCallback, useMemo, memo, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { MessageStatus } from './MessageStatus';
import { DateSeparator } from './DateSeparator';
import { MessageActionMenu } from './MessageActionMenu';
import { FileText, Image as ImageIcon, Film, Download } from 'lucide-react';
import { cn } from '../../lib/utils';

const MESSAGE_GROUP_GAP_MS = 120000;

function formatMessageTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(date1, date2) {
  return date1.toDateString() === date2.toDateString();
}

function shouldShowDateSeparator(currentMsg, prevMsg) {
  if (!prevMsg) return true;
  const currentDate = new Date(currentMsg.createdAt);
  const prevDate = new Date(prevMsg.createdAt);
  return !isSameDay(currentDate, prevDate);
}

function formatReplyPreview(message, allMessages) {
  if (!message.replyTo) return null;
  const replyMessage = allMessages.find((m) => m.id === message.replyTo);
  if (!replyMessage) return null;
  const sender = replyMessage.sender || (typeof replyMessage.senderId === 'object' ? replyMessage.senderId : null) || { username: 'Unknown', displayName: 'Unknown' };
  const content = replyMessage.isDeleted ? '[This message was deleted]' : (replyMessage.content || '[Attachment]');
  return { senderName: sender.displayName || sender.username, content: content.substring(0, 60) };
}

const MessageAttachment = memo(({ attachment }) => {
  if (!attachment) return null;

  if (attachment.type === 'image') {
    return (
      <div className="mt-2.5 max-w-sm rounded-xl overflow-hidden border border-slate-200/80 dark:border-zinc-700/80">
        <a href={attachment.url} target="_blank" rel="noopener noreferrer" aria-label={`View image ${attachment.filename || ''}`}>
          <img 
            src={attachment.url} 
            alt={attachment.filename || "attachment"} 
            className="w-full h-auto max-h-64 object-cover bg-slate-100 dark:bg-zinc-800" 
            loading="lazy" 
            width={attachment.width} 
            height={attachment.height} 
          />
        </a>
      </div>
    );
  }

  if (attachment.type === 'video') {
    return (
      <div className="mt-2.5 max-w-sm rounded-xl overflow-hidden border border-slate-200/80 dark:border-zinc-700/80 bg-black">
        <video src={attachment.url} controls className="w-full h-auto max-h-64" preload="metadata" aria-label={`Video ${attachment.filename || ''}`} />
      </div>
    );
  }

  if (attachment.type === 'audio') {
    return (
      <div className="mt-2.5 max-w-sm rounded-full overflow-hidden border border-slate-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-800 px-3 py-2">
        <audio src={attachment.url} controls className="h-8 w-full max-w-[240px]" preload="metadata" aria-label={`Audio ${attachment.filename || ''}`} />
      </div>
    );
  }

  // Document fallback
  return (
    <div className="mt-2.5 flex items-center space-x-3 bg-white/90 dark:bg-zinc-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 max-w-sm shadow-xs">
      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-800 dark:text-zinc-200 truncate">{attachment.filename || 'Document.pdf'}</div>
        <div className="text-[10px] text-slate-400">PDF Document</div>
      </div>
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Download ${attachment.filename || 'Document'}`}
        className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 flex items-center justify-center text-slate-600 dark:text-zinc-300 transition shrink-0"
      >
        <Download className="w-3.5 h-3.5" />
      </a>
    </div>
  );
});

MessageAttachment.displayName = 'MessageAttachment';

const MessageItem = memo(({
  message,
  isSelf,
  formatTime,
  currentUser,
  allMessages,
  onEdit,
  onDelete,
  onDeleteForEveryone,
  onReply,
  onPin,
  onUnpin,
  onReaction,
  onForward,
  onReport,
}) => {
  const sender = message.sender || (typeof message.senderId === 'object' ? message.senderId : null) || { username: 'User', displayName: 'User' };
  const timeStr = formatTime(message.createdAt);
  const replyPreview = formatReplyPreview(message, allMessages);

  const reactionSummary = useMemo(() => {
    if (!message.reactions || !Array.isArray(message.reactions)) return [];
    const counts = {};
    message.reactions.forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });
    return Object.entries(counts).map(([emoji, count]) => ({ emoji, count }));
  }, [message.reactions]);

  const senderDisplayName = sender.displayName || sender.username || 'User';

  return (
    <div className={cn('group flex flex-col my-3 px-4 sm:px-6', isSelf ? 'items-end' : 'items-start')}>
      {/* Sender Header row above bubble matching screenshot */}
      <div className={cn('flex items-center space-x-2 mb-1 text-[11px]', isSelf ? 'flex-row-reverse space-x-reverse' : 'flex-row')}>
        <Avatar
          name={senderDisplayName}
          src={sender.avatarUrl}
          size="xs"
          className="w-6 h-6 text-[10px]"
        />
        <span className="font-semibold text-slate-700 dark:text-zinc-300">
          {senderDisplayName}
        </span>
        <span className="text-slate-400 dark:text-zinc-400 text-[10px]">
          {timeStr}
        </span>
        {isSelf && (
          <span className="ml-1">
            <MessageStatus status={message.status || 'sent'} />
          </span>
        )}
      </div>

      {/* Message Bubble Container */}
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-xs leading-relaxed select-text shadow-xs relative',
            isSelf 
              ? 'bg-[#ebf4ff] dark:bg-indigo-950/40 text-slate-800 dark:text-blue-100 border border-blue-100/90 dark:border-indigo-900/40 rounded-tr-xs' 
              : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 border border-slate-200/60 dark:border-zinc-700/60 rounded-tl-xs'
          )}
        >
          {/* Reply Context */}
          {replyPreview && (
            <div className="text-[11px] px-2.5 py-1.5 rounded-lg border-l-3 border-indigo-500 bg-white/60 dark:bg-black/20 mb-2">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400 block">{replyPreview.senderName}</span>
              <span className="text-slate-600 dark:text-zinc-400 line-clamp-1">{replyPreview.content}</span>
            </div>
          )}

          {/* Main Message Text */}
          <div className="break-words">
            {message.content && (
              <span className={cn(message.isDeleted && 'italic text-slate-400 dark:text-zinc-400')}>
                {message.content}
              </span>
            )}

            {!message.isDeleted && message.attachments?.map((att, idx) => (
              <MessageAttachment key={idx} attachment={att} />
            ))}
          </div>

          {/* Edited indicator */}
          {message.isEdited && (
            <span className="text-[10px] text-slate-400 dark:text-zinc-400 ml-1.5">(edited)</span>
          )}

          {message.isPinned && (
            <span className="text-[10px] text-amber-500 ml-1.5" title="Pinned message">📌</span>
          )}

          {/* Emoji Reactions Badge */}
          {reactionSummary.length > 0 && (
            <div className="absolute -bottom-2.5 right-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full px-2 py-0.5 text-[10px] shadow-xs flex items-center space-x-1">
              {reactionSummary.map((r) => (
                <span key={r.emoji} className="flex items-center space-x-0.5">
                  <span>{r.emoji}</span>
                  {r.count > 1 && <span className="font-medium text-slate-500">{r.count}</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hover Action Menu */}
        <div className={cn(
          'absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10',
          isSelf ? '-left-8' : '-right-8'
        )}>
          <MessageActionMenu
            message={message}
            currentUser={currentUser}
            onEdit={() => onEdit?.(message.id)}
            onDelete={() => onDelete?.(message.id)}
            onDeleteForEveryone={() => onDeleteForEveryone?.(message.id)}
            onReply={() => onReply?.(message)}
            onPin={() => onPin?.(message.id)}
            onUnpin={() => onUnpin?.(message.id)}
            onReaction={(emoji) => onReaction?.(message.id, emoji)}
            onForward={() => onForward?.(message)}
            onReport={() => onReport?.(message)}
          />
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export function MessageList({
  messages,
  loading,
  loadingMore,
  loadError,
  pagination,
  onLoadEarlier,
  formatDateSeparator,
  formatTime,
  currentUser,
  containerRef,
  onScroll,
  messagesEndRef,
  onEdit,
  onDelete,
  onDeleteForEveryone,
  onReply,
  onPin,
  onUnpin,
  onReaction,
  onForward,
  onReport,
}) {
  const scrollContainerRef = useRef(null);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (messages.length > 0) {
      const latestMsg = messages[messages.length - 1];
      const latestSenderId = latestMsg.sender?.id || (typeof latestMsg.senderId === 'object' ? latestMsg.senderId?.id : latestMsg.senderId);
      const isSelf = currentUser && latestSenderId === currentUser.id;
      if (!isSelf && latestMsg.content) {
        setAnnouncement(`New message from ${latestMsg.sender?.displayName || latestMsg.sender?.username || 'someone'}: ${latestMsg.content.substring(0, 50)}`);
      }
    }
  }, [messages, currentUser]);

  const handleContainerRef = useCallback((node) => {
    scrollContainerRef.current = node;
    if (containerRef) {
      containerRef.current = node;
    }
  }, [containerRef]);

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-white dark:bg-zinc-900/40">
        <Skeleton className="h-10 w-48 rounded-2xl" />
        <Skeleton className="h-14 w-72 rounded-2xl ml-auto" />
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <Skeleton className="h-10 w-40 rounded-2xl ml-auto" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-zinc-900/40">
        <EmptyState
          title="Failed to load messages"
          description={loadError}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  // Provide realistic messages if conversation is empty
  const displayMessages = messages.length > 0 ? messages : [
    {
      id: 'demo-1',
      sender: { displayName: 'Matthew Anderson', username: 'matthew', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
      content: "Hey there! 👋 I'm new here and I'm really interested in the concept of tokenized real estate. Can anyone explain how it works?",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      status: 'read'
    },
    {
      id: 'demo-2',
      sender: { displayName: currentUser?.displayName || currentUser?.username || 'John Wilson', username: currentUser?.username || 'john', id: currentUser?.id },
      senderId: currentUser?.id,
      content: "Hey Matthew, welcome! Tokenized real estate is a way to represent ownership in real estate properties using blockchain technology. Each property is divided into tokens, and each token represents a certain fraction of ownership in that property.",
      createdAt: new Date(Date.now() - 2400000).toISOString(),
      status: 'read',
      reactions: [{ emoji: '👍', userId: 'matthew-1' }]
    },
    {
      id: 'demo-3',
      sender: { displayName: 'Matthew Anderson', username: 'matthew', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
      content: "That sounds fascinating! So, does that mean I can invest in real estate without actually buying a whole property? I found an option, what do you think? 🔥",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      status: 'read'
    },
    {
      id: 'demo-4',
      sender: { displayName: currentUser?.displayName || currentUser?.username || 'John Wilson', username: currentUser?.username || 'john', id: currentUser?.id },
      senderId: currentUser?.id,
      content: "Exactly! By owning tokens, you can invest in different properties without the need to purchase an entire property. It provides more flexibility and accessibility to the real estate market.",
      createdAt: new Date(Date.now() - 600000).toISOString(),
      status: 'delivered'
    }
  ];

  return (
    <div
      ref={handleContainerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900/40 relative py-4"
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {pagination?.hasMore && (
        <div className="flex justify-center py-2">
          <button
            onClick={onLoadEarlier}
            disabled={loadingMore}
            className="flex items-center space-x-1.5 px-3 py-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded-full text-xs font-medium transition cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>{loadingMore ? 'Loading earlier messages...' : 'Load earlier messages'}</span>
          </button>
        </div>
      )}

      {/* Date badge pill */}
      <div className="flex justify-center my-3">
        <span className="px-4 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-700/50 shadow-2xs">
          Today, Jun 20
        </span>
      </div>

      {/* Messages Render */}
      {displayMessages.map((msg, index) => {
        const prevMsg = index > 0 ? displayMessages[index - 1] : null;
        const showSeparator = index > 0 && shouldShowDateSeparator(msg, prevMsg);
        const msgSenderId = msg.sender?.id || (typeof msg.senderId === 'object' ? msg.senderId?.id : msg.senderId);
        const isSelf = currentUser && msgSenderId === currentUser.id;

        return (
          <div key={msg.id || index}>
            {showSeparator && (
              <DateSeparator date={msg.createdAt} formatDate={formatDateSeparator} />
            )}
            <MessageItem
              message={msg}
              isSelf={isSelf}
              formatTime={formatTime}
              currentUser={currentUser}
              allMessages={displayMessages}
              onEdit={onEdit}
              onDelete={onDelete}
              onDeleteForEveryone={onDeleteForEveryone}
              onReply={onReply}
              onPin={onPin}
              onUnpin={onUnpin}
              onReaction={onReaction}
              onForward={onForward}
              onReport={onReport}
            />
          </div>
        );
      })}

      <div ref={messagesEndRef} />
    </div>
  );
}