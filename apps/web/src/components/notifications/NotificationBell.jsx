import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { getNotificationsRequest, markNotificationAsReadRequest, markAllNotificationsAsReadRequest } from '../../api/notificationApi';
import { useToast } from '../ui/Toast';
import { Avatar } from '../ui/Avatar';
import { formatTime } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import { Dropdown } from '../ui/Dropdown';

export function NotificationBell() {
  const { unreadCount, notifications, setNotifications, setPagination, appendNotifications, markAsReadLocally, markAllAsReadLocally, hasNextPage, nextCursor } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const res = await getNotificationsRequest();
      setNotifications(res.data.notifications);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && notifications.length === 0 && !loading) {
      fetchInitial();
    }
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsReadRequest();
      markAllAsReadLocally();
      addToast({ message: 'All notifications marked as read' });
    } catch {
      addToast({ message: 'Failed to mark all as read', type: 'error' });
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsReadRequest(id);
      markAsReadLocally(id);
    } catch {
      // ignore
    }
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      trigger={
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-100"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-zinc-950" />
          )}
        </button>
      }
      className="w-80 p-0 right-0 max-h-[80vh] flex flex-col"
    >
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900/95 backdrop-blur z-10">
        <h3 className="font-semibold text-zinc-100">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" />
            Mark all read
          </button>
        )}
      </div>

      <div className="overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="text-center p-4 text-xs text-zinc-500">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center p-4 text-xs text-zinc-500">No notifications</div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif._id}
              onClick={() => {
                if (!notif.isRead) handleMarkRead(notif._id);
              }}
              className={cn(
                "p-2 rounded-lg cursor-pointer flex gap-3 transition-colors group",
                notif.isRead ? "hover:bg-zinc-800/50 opacity-70" : "bg-indigo-500/10 hover:bg-indigo-500/20"
              )}
            >
              <div className="pt-1">
                <Avatar name={notif.actor?.displayName || notif.actor?.username || 'System'} src={notif.actor?.avatarUrl} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200">
                  <span className="font-semibold text-zinc-100">{notif.actor?.displayName || notif.actor?.username}</span>{' '}
                  {notif.content}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-zinc-500">{formatTime(notif.createdAt)}</span>
                  {!notif.isRead && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkRead(notif._id);
                      }}
                      className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Dropdown>
  );
}
