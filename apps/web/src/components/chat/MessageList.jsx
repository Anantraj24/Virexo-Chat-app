import { useRef, useEffect, useCallback, useMemo } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { MessageStatus } from './MessageStatus';
import { DateSeparator } from './DateSeparator';
import { MessageActionMenu } from './MessageActionMenu';
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
  const replyMessage = allMessages.find((m) => m._id === message.replyTo);
  if (!replyMessage) return null;
  const sender = replyMessage.senderId || { username: 'Unknown', displayName: 'Unknown' };
  const content = replyMessage.isDeleted ? '[This message was deleted]' : (replyMessage.content || '[Attachment]');
  return { senderName: sender.displayName || sender.username, content: content.substring(0, 60) };
}

const MessageItem = ({ message, isSelf, formatTime, currentUser, allMessages, onEdit, onDelete, onDeleteForEveryone, onReply, onPin, onUnpin, onReaction }) => {
  const sender = message.senderId || { username: 'Unknown', displayName: 'Unknown' };
  const showAvatar = !isSelf;
  const timeStr = message.createdAt ? formatTime(message.createdAt) : '';
  const replyPreview = formatReplyPreview(message, allMessages);
  const reactions = message.reactions || [];
  const reactionSummary = reactions.length > 0 ? reactions : [];

  return (
    <div
      className={cn(
        'group flex items-start space-x-3 p-2 rounded-xl hover:bg-zinc-900/50 transition',
        isSelf && 'flex-row-reverse space-x-reverse'
      )}
    >
      {showAvatar && (
        <div className="shrink-0 pt-1">
          <Avatar
            name={sender.displayName || sender.username}
            src={sender.avatarUrl}
            size="sm"
          />
        </div>
      )}

      <div className={cn('min-w-0 flex-1', isSelf && 'text-right')}>
        {!isSelf && (
          <span className="text-xs font-bold text-zinc-100 block">
            {sender.displayName || sender.username}
          </span>
        )}

        {replyPreview && (
          <div className={cn(
            'text-[10px] px-2 py-1 rounded-lg border mb-1',
            isSelf ? 'border-zinc-700 bg-zinc-800/50 text-zinc-400' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
          )}>
            <span className="font-semibold">{replyPreview.senderName}</span>
            <span className="mx-1">{replyPreview.content}</span>
          </div>
        )}

        <div className={cn('flex items-center space-x-2 mt-0.5', isSelf && 'flex-row-reverse')}>
          <span
            className={cn(
              'text-xs leading-relaxed',
              message.isDeleted ? 'italic text-zinc-500' : 'text-zinc-300'
            )}
          >
            {message.content || '[Attachment]'}
          </span>
          {message.isEdited && (
            <span className="text-[10px] text-zinc-600" title="Edited">(edited)</span>
          )}
          {isSelf && !message.isDeleted && (
            <MessageStatus status={message.status || 'sent'} />
          )}
          {!isSelf && (
            <span className="text-[10px] text-zinc-500">{timeStr}</span>
          )}
          {message.isPinned && (
            <span className="text-[10px] text-amber-400 shrink-0" title="Pinned">📌</span>
          )}
          {reactionSummary.length > 0 && (
            <span className="text-[10px] text-zinc-500 shrink-0">
              {reactionSummary.map((r) => r.emoji).join(' ')}
            </span>
          )}
          <MessageActionMenu
            message={message}
            currentUser={currentUser}
            onEdit={onEdit}
            onDelete={onDelete}
            onDeleteForEveryone={onDeleteForEveryone}
            onReply={onReply}
            onPin={onPin}
            onUnpin={onUnpin}
            onReaction={onReaction}
          />
        </div>
      </div>
    </div>
  );
};

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
}) {
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (scrollContainerRef.current && onScroll) {
      scrollContainerRef.current.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        scrollContainerRef.current?.removeEventListener('scroll', onScroll);
      };
    }
  }, [onScroll]);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto space-y-1 p-2"
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
            const isSelf = msg.senderId?._id === currentUser?._id;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showDateSep = shouldShowDateSeparator(msg, prevMsg);

            return (
              <div key={msg._id}>
                {showDateSep && (
                  <DateSeparator date={formatDateSeparator(msg.createdAt)} />
                )}
                <MessageItem
                  message={msg}
                  isSelf={isSelf}
                  formatTime={formatTime}
                  currentUser={currentUser}
                  allMessages={messages}
                  onEdit={() => onEdit?.(msg._id)}
                  onDelete={() => onDelete?.(msg._id)}
                  onDeleteForEveryone={() => onDeleteForEveryone?.(msg._id)}
                  onReply={() => onReply?.(msg)}
                  onPin={() => onPin?.(msg._id)}
                  onUnpin={() => onUnpin?.(msg._id)}
                  onReaction={(emoji) => onReaction?.(msg._id, emoji)}
                />
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}