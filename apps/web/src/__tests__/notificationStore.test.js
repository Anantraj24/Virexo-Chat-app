import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '../store/useNotificationStore';

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearNotifications();
  });

  it('should initialize with empty state', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.hasNextPage).toBe(false);
    expect(state.nextCursor).toBeNull();
  });

  it('addNotification should prepend a new notification and increment unreadCount', () => {
    useNotificationStore.getState().addNotification({
      id: 'n1',
      content: 'You have a reply',
      isRead: false,
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].id).toBe('n1');
    expect(state.unreadCount).toBe(1);
  });

  it('addNotification should not increment unreadCount for read notifications', () => {
    useNotificationStore.getState().addNotification({
      id: 'n_read',
      content: 'Read notification',
      isRead: true,
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(0);
  });

  it('addNotification should prevent duplicate inserts', () => {
    const notification = { id: 'dup1', content: 'Duplicate', isRead: false };
    useNotificationStore.getState().addNotification(notification);
    useNotificationStore.getState().addNotification(notification);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
  });

  it('markAsReadLocally should flip isRead and decrement count', () => {
    useNotificationStore.getState().addNotification({ id: 'mr1', content: 'test', isRead: false });
    useNotificationStore.getState().addNotification({ id: 'mr2', content: 'test2', isRead: false });
    expect(useNotificationStore.getState().unreadCount).toBe(2);

    useNotificationStore.getState().markAsReadLocally('mr1');

    const state = useNotificationStore.getState();
    expect(state.notifications.find(n => n.id === 'mr1').isRead).toBe(true);
    expect(state.unreadCount).toBe(1);
  });

  it('markAllAsReadLocally should set all to read and zero count', () => {
    useNotificationStore.getState().addNotification({ id: 'a1', content: 'a', isRead: false });
    useNotificationStore.getState().addNotification({ id: 'a2', content: 'b', isRead: false });
    useNotificationStore.getState().addNotification({ id: 'a3', content: 'c', isRead: false });

    useNotificationStore.getState().markAllAsReadLocally();

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every(n => n.isRead)).toBe(true);
  });

  it('clearNotifications should reset the entire state', () => {
    useNotificationStore.getState().addNotification({ id: 'x', content: 'x', isRead: false });
    useNotificationStore.getState().setPagination({ hasNextPage: true, nextCursor: 'abc' });

    useNotificationStore.getState().clearNotifications();

    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
    expect(state.unreadCount).toBe(0);
    expect(state.hasNextPage).toBe(false);
    expect(state.nextCursor).toBeNull();
  });

  it('appendNotifications should add new notifications without duplicating existing', () => {
    useNotificationStore.getState().addNotification({ id: 'existing', content: 'old', isRead: true });
    useNotificationStore.getState().appendNotifications([
      { id: 'existing', content: 'old', isRead: true },
      { id: 'new1', content: 'new', isRead: false },
    ]);

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(2);
  });
});
