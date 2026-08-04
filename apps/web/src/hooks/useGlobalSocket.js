import { useEffect } from 'react';
import { SOCKET_EVENTS } from '@virexo/shared';
import { socketClientManager } from '../lib/socketClient';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { playNotificationSound, showDesktopNotification } from '../lib/notificationHelper';

export function useGlobalSocket() {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (!user) return;

    const socket = socketClientManager.connect();
    if (!socket) return;

    const handleNewNotification = (notification) => {
      addNotification(notification);
      
      const settings = user.notificationSettings || {};
      
      if (settings.soundEnabled !== false) {
        playNotificationSound();
      }

      if (settings.desktopNotifications !== false) {
        showDesktopNotification(
          notification.actor?.displayName || notification.actor?.username || 'Virexo',
          {
            body: notification.content,
          }
        );
      }
    };

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW, handleNewNotification);
    };
  }, [user, addNotification]);
}
