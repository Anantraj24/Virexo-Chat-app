import { useRef, useEffect, useCallback, useMemo, memo, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '../ui/Button';
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

function shouldGroupWithPrevious(currentMsg, prevMsg) {
  if (!prevMsg) return false;
  if (prevMsg.isDeleted) return false;
  const currentDate = new Date(currentMsg.createdAt);
  const prevDate = new Date(prevMsg.createdAt);
  const diffMs = currentDate - prevDate;
  return diffMs < MESSAGE_GROUP_GAP_MS;
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
      <div className="mt-2 max-w-sm rounded-lg overflow-hidden border border-zinc-800">
        <a href={attachment.url} target="_blank" rel="noopener noreferrer" aria-label={`View image ${attachment.filename || ''}`}>
          <img 
            src={attachment.url} 
            alt={attachment.filename || "attachment"} 
            className="w-full h-auto max-h-64 object-cover bg-zinc-800" 
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
      <div className="mt-2 max-w-sm rounded-lg overflow-hidden border border-zinc-800 bg-black">
        <video src={attachment.url} controls className="w-full h-auto max-h-64" preload="metadata" aria-label={`Video ${attachment.filename || ''}`} />
      </div>
    );
  }

  if (attachment.type === 'audio') {
    return (
      <div className="mt-2 max-w-sm rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 px-3 py-2">
        <audio src={attachment.url} controls className="h-8 w-full max-w-[240px]" preload="metadata" aria-label={`Audio ${attachment.filename || ''}`} />
      </div>
    );
  }

  // Document fallback
  return (
    <div className="mt-2 flex items-center space-x-3 bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50 max-w-sm">
      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-200 truncate">{attachment.filename || 'Document'}</div>
        <div className="text-xs text-zinc-500">File</div>
      </div>
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Download ${attachment.filename || 'Document'}`}
        className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-300 transition shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Download className="w-4 h-4" />
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
  const sender = message.sender || (typeof message.senderId === 'object' ? message.senderId : null) || { username: 'Unknown', displayName: 'Unknown' };
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

  return (
    <div
      className={cn(
        'group flex items-start my-1.5 px-2 sm:px-4',
        isSelf ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 py-2 shadow-sm text-xs relative select-text',
          isSelf ? 'wa-bubble-sent text-white' : 'wa-bubble-received text-zinc-100'
        )}
      >
        {!isSelf && (
          <span className="text-[11px] font-bold text-emerald-400 block mb-0.5">
            {sender.displayName || sender.username}
          </span>
        )}

        {replyPreview && (
          <div className="text-[11px] px-2.5 py-1.5 rounded-r-lg border-l-4 border-[#00a884] bg-black/25 mb-1.5">
            <span className="font-bold text-[#00a884] block">{replyPreview.senderName}</span>
            <span className="text-zinc-300 line-clamp-1">{replyPreview.content}</span>
          </div>
        )}

        <div className="pr-12 leading-relaxed break-words">
          {message.content && (
            <span className={cn(message.isDeleted && 'italic text-zinc-400')}>
              {message.content}
            </span>
          )}

          {!message.isDeleted && message.attachments?.map((att, idx) => (
            <MessageAttachment key={idx} attachment={att} />
          ))}
        </div>

        {/* Bottom Right WhatsApp Timestamp & Checkmark Badge */}
        <div className="absolute right-2 bottom-1.5 flex items-center space-x-1 select-none pointer-events-none">
          {message.isEdited && (
            <span className="text-[10px] text-zinc-400/80 mr-0.5">(edited)</span>
          )}
          <span className="text-[10px] text-zinc-400 tracking-tighter">{timeStr}</span>
          {isSelf && !message.isDeleted && (
            <MessageStatus status={message.status || 'sent'} />
          )}
          {message.isPinned && (
            <span className="text-[10px] text-amber-400 ml-0.5">📌</span>
          )}
        </div>

        {reactionSummary.length > 0 && (
          <div className="absolute -bottom-2 right-4 bg-zinc-900/90 border border-zinc-800 rounded-full px-1.5 py-0.5 text-[10px] shadow-md flex items-center space-x-0.5">
            {reactionSummary.map((r) => (
              <span key={r.emoji}>{r.emoji}</span>
            ))}
          </div>
        )}

        {/* Hover Menu Overlay */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
      const isSelf = latestSenderId === currentUser?.id;
      
      if (!isSelf && !latestMsg.isDeleted) {
        const sender = latestMsg.sender || (typeof latestMsg.senderId === 'object' ? latestMsg.senderId : null);
        const senderName = sender?.displayName || sender?.username || 'someone';
        setAnnouncement(`New message from ${senderName}`);
        
        // Clear announcement to allow same string to be announced again if needed
        const timer = setTimeout(() => setAnnouncement(''), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [messages, currentUser]);

  const handleScroll = useCallback((e) => {
    if (onScroll) onScroll(e);
  }, [onScroll]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        el.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  return (
    <>
      <div 
        aria-live="polite" 
        className="sr-only"
        role="status"
        aria-atomic="true"
      >
        {announcement}
      </div>
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-1 p-3 whatsapp-wallpaper"
        role="log"
        aria-label="Message history"
      >
      {loading ? (
        <div className="space-y-4 py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`flex items-start space-x-3 p-2 ${i % 2 === 0 ? '' : 'flex-row-reverse space-x-reverse'}`}>
              <Skeleton variant="circle" className="w-8 h-8 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" className="w-1/3 h-3" />
                <Skeleton variant="text" className="w-2/3 h-4" />
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <EmptyState
          icon={<span className="text-red-400">!</span>}
          title="Failed to load messages"
          description={loadError}
          action={
            <Button variant="outline" size="sm" onClick={onLoadEarlier}>
              Retry
            </Button>
          }
        />
      ) : messages.length === 0 ? (
        <EmptyState
          icon={<span className="text-indigo-400">💬</span>}
          title="No messages yet"
          description="Send a message to start the conversation."
        />
      ) : (
        <>
          {pagination.hasNextPage && (
            <div className="flex justify-center py-2">
              <Button
                variant="outline"
                size="sm"
                isLoading={loadingMore}
                onClick={onLoadEarlier}
                leftIcon={<ArrowUp className="w-3.5 h-3.5" />}
              >
                Load earlier messages
              </Button>
            </div>
          )}

          {messages.map((msg, index) => {
            const msgSenderId = msg.sender?.id || (typeof msg.senderId === 'object' ? msg.senderId?.id : msg.senderId);
            const isSelf = msgSenderId === currentUser?.id;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showDateSep = shouldShowDateSeparator(msg, prevMsg);

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <DateSeparator date={formatDateSeparator(msg.createdAt)} />
                )}
                <MessageItem
                  message={msg}
                  isSelf={isSelf}
                  formatTime={formatTime}
                  currentUser={currentUser}
                  allMessages={messages}
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

          <div ref={messagesEndRef} tabIndex="-1" />
        </>
      )}
    </div>
    </>
  );
}