import { useRef, useEffect, useCallback, useMemo } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Avatar } from '../ui/Avatar';
import { MessageStatus } from './MessageStatus';
import { DateSeparator } from './DateSeparator';
import { cn } from '../../lib/utils';

const MESSAGE_GROUP_GAP_MS = 120000;

function formatMessageTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(date1, date2) {
  return date1.toDateString() === date2.toDateString();
}

function getDateLabel(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

const MessageItem = ({ message, isSelf, formatTime }) => {
  const sender = message.senderId || { username: 'Unknown', displayName: 'Unknown' };
  const showAvatar = !isSelf;
  const timeStr = message.createdAt ? formatTime(message.createdAt) : '';

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
        <div className="flex items-center space-x-2 mt-0.5">
          {isSelf && (
            <span className="text-[10px] text-zinc-500 order-2">{timeStr}</span>
          )}
          <span
            className={cn(
              'text-xs leading-relaxed',
              message.isDeleted ? 'italic text-zinc-500' : 'text-zinc-300'
            )}
          >
            {message.content || '[Attachment]'}
          </span>
          {!isSelf && (
            <span className="text-[10px] text-zinc-500">{timeStr}</span>
          )}
          {isSelf && !message.isDeleted && (
            <MessageStatus status={message.status || 'sent'} />
          )}
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

  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentGroup = [];
    let lastDateLabel = null;

    messages.forEach((msg, index) => {
      const dateLabel = formatDateSeparator(msg.createdAt);
      const showDateSep = dateLabel !== lastDateLabel;

      if (showDateSep && currentGroup.length > 0) {
        groups.push({ type: 'date-separator', label: lastDateLabel, key: `date-${lastDateLabel}-${index}` });
        currentGroup = [];
      }

      currentGroup.push(msg);
      lastDateLabel = dateLabel;
    });

    if (currentGroup.length > 0 && lastDateLabel) {
      groups.push({ type: 'date-separator', label: lastDateLabel, key: `date-${lastDateLabel}-end` });
    }

    return groups;
  }, [messages, formatDateSeparator]);

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

          {groupedMessages.map((group) => {
            if (group.type === 'date-separator') {
              return <DateSeparator key={group.key} date={group.label} />;
            }
            return null;
          })}

          {messages.map((msg, index) => {
            const isSelf = msg.senderId?._id === currentUser?._id;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showDateSep = shouldShowDateSeparator(msg, prevMsg);
            const showAvatar = !isSelf && !shouldGroupWithPrevious(msg, prevMsg);

            return (
              <div key={msg._id}>
                {showDateSep && (
                  <DateSeparator date={formatDateSeparator(msg.createdAt)} />
                )}
                <MessageItem
                  message={msg}
                  isSelf={isSelf}
                  formatTime={formatTime}
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