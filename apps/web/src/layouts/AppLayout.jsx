import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { APP_NAME } from '@virexo/shared';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from '../components/ui/Toast';
import { logoutRequest, logoutAllRequest, resendVerificationRequest } from '../api/authApi';
import { listConversationsRequest } from '../api/conversationApi';
import { Avatar } from '../components/ui/Avatar';
import { Dropdown } from '../components/ui/Dropdown';
import { NewDMModal } from '../components/NewDMModal';
import { CreateGroupModal } from '../components/CreateGroupModal';
import { GroupSettingsModal } from '../components/GroupSettingsModal';
import {
  Hash,
  MessageSquare,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Laptop,
  Plus,
  Search,
  Bell,
  LogOut,
  ShieldAlert,
  AlertTriangle,
  Mail,
  MoreVertical,
} from 'lucide-react';

export function AppLayout() {
  const { theme, setTheme, sidebarOpen, toggleSidebar, setSidebarOpen } = usePreferencesStore();
  const { user, clearAuth } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [resendingEmail, setResendingEmail] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Modals state
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [activeGroupSettings, setActiveGroupSettings] = useState(null);

  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await listConversationsRequest({ limit: 50 });
      setConversations(res.data.conversations || []);
    } catch {
      // Ignore initial load error silently
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuth();
      addToast({ message: 'Signed out successfully', type: 'info' });
      navigate('/login', { replace: true });
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAllRequest();
      addToast({ message: 'Signed out of all active sessions', type: 'info' });
    } catch (err) {
      addToast({ message: err.message || 'Failed to logout of all sessions', type: 'error' });
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    try {
      await resendVerificationRequest();
      addToast({ message: 'Verification email sent! Check your inbox.', type: 'success' });
    } catch (err) {
      addToast({ message: err.message || 'Failed to send verification email', type: 'error' });
    } finally {
      setResendingEmail(false);
    }
  };

  const themeItems = [
    { label: 'Light Mode', icon: <Sun className="w-3.5 h-3.5" />, onClick: () => setTheme('light') },
    { label: 'Dark Mode', icon: <Moon className="w-3.5 h-3.5" />, onClick: () => setTheme('dark') },
    { label: 'System Default', icon: <Laptop className="w-3.5 h-3.5" />, onClick: () => setTheme('system') },
  ];

  const userMenuItems = [
    { label: 'Settings', icon: <Settings className="w-3.5 h-3.5" />, onClick: () => navigate('/settings') },
    ...(user?.role === 'admin'
      ? [{ label: 'Admin Dashboard', icon: <ShieldAlert className="w-3.5 h-3.5" />, onClick: () => {} }]
      : []),
    { divider: true },
    { label: 'Sign Out All Devices', icon: <LogOut className="w-3.5 h-3.5" />, danger: true, onClick: handleLogoutAll },
    { label: 'Sign Out', icon: <LogOut className="w-3.5 h-3.5" />, danger: true, onClick: handleLogout },
  ];

  // Separate channels (group/channel) and direct DMs
  const channels = conversations.filter((c) => c.type === 'group' || c.type === 'channel');
  const directMessages = conversations.filter((c) => c.type === 'direct');

  // Helper to format DM user name
  const getDMRecipient = (conv) => {
    const otherMember = conv.members?.find((m) => (m.userId._id || m.userId).toString() !== user?._id);
    return otherMember?.userId || { username: 'Unknown User', displayName: 'Unknown User' };
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-zinc-900 border-r border-zinc-800/80 flex flex-col transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Workspace Brand Header */}
        <div className="h-14 px-4 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              V
            </div>
            <span className="font-bold text-sm tracking-tight text-white">{APP_NAME} Community</span>
          </Link>

          <button
            onClick={toggleSidebar}
            className="md:hidden text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Group Channels Section */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-1.5">
              <span>Channels</span>
              <button
                onClick={() => setGroupModalOpen(true)}
                className="hover:text-white p-0.5 rounded transition cursor-pointer"
                title="Create Group Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <nav className="space-y-0.5">
              {loadingConversations ? (
                <div className="px-2 py-2 text-xs text-zinc-500">Loading channels...</div>
              ) : channels.length > 0 ? (
                channels.map((channel) => (
                  <div key={channel._id} className="group flex items-center justify-between">
                    <NavLink
                      to={`/channels/${channel._id}`}
                      className={({ isActive }) =>
                        `flex-1 flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                          isActive
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                        }`
                      }
                    >
                      <Hash className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{channel.name}</span>
                    </NavLink>
                    <button
                      onClick={() => setActiveGroupSettings(channel)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition cursor-pointer"
                      title="Group Settings"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-zinc-500">No channels yet</div>
              )}
            </nav>
          </div>

          {/* Direct Messages Section */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-1.5">
              <span>Direct Messages</span>
              <button
                onClick={() => setDmModalOpen(true)}
                className="hover:text-white p-0.5 rounded transition cursor-pointer"
                title="New Direct Message"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <nav className="space-y-0.5">
              {loadingConversations ? (
                <div className="px-2 py-2 text-xs text-zinc-500">Loading DMs...</div>
              ) : directMessages.length > 0 ? (
                directMessages.map((dm) => {
                  const recipient = getDMRecipient(dm);
                  return (
                    <NavLink
                      key={dm._id}
                      to={`/dms/${dm._id}`}
                      className={({ isActive }) =>
                        `flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                          isActive
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                        }`
                      }
                    >
                      <Avatar name={recipient.displayName || recipient.username} src={recipient.avatarUrl} size="xs" status={recipient.status} />
                      <span className="truncate">{recipient.displayName || recipient.username}</span>
                    </NavLink>
                  );
                })
              ) : (
                <div className="px-2 py-1.5 text-xs text-zinc-500">No direct messages</div>
              )}
            </nav>
          </div>
        </div>

        {/* User Profile & Theme Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 shrink-0 flex items-center justify-between">
          <Dropdown
            trigger={
              <div className="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-zinc-800/60 transition group text-left cursor-pointer">
                <Avatar name={user?.displayName || user?.username || 'User'} status={user?.status || 'online'} size="sm" src={user?.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white">
                    {user?.displayName || user?.username || 'User'}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">@{user?.username || ''}</div>
                </div>
              </div>
            }
            items={userMenuItems}
            align="left"
          />

          <div className="flex items-center space-x-1">
            <Dropdown
              trigger={
                <button className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer">
                  {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              }
              items={themeItems}
            />

            <Link
              to="/settings"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Main App Content View */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
        {/* Email Verification Banner */}
        {user && !user.isEmailVerified && (
          <div className="bg-amber-950/60 border-b border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Please verify your email address to unlock full features.</span>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="text-amber-400 hover:text-amber-300 font-semibold underline flex items-center space-x-1 cursor-pointer disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5 inline mr-1" />
              <span>{resendingEmail ? 'Sending...' : 'Resend Email'}</span>
            </button>
          </div>
        )}

        {/* Main App Top Header */}
        <header className="h-14 px-4 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSidebar}
              className="md:hidden text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2 text-xs text-zinc-400 font-medium">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span className="text-zinc-200 font-semibold">Virexo Workspace</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative hidden sm:block w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-zinc-900 text-xs text-zinc-200 placeholder-zinc-500 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-800 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <button className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* View Router Outlet */}
        <main className="flex-1 overflow-y-auto relative p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <NewDMModal
        isOpen={dmModalOpen}
        onClose={() => setDmModalOpen(false)}
        onConversationCreated={fetchConversations}
      />
      <CreateGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onGroupCreated={fetchConversations}
      />
      <GroupSettingsModal
        isOpen={!!activeGroupSettings}
        onClose={() => setActiveGroupSettings(null)}
        conversation={activeGroupSettings}
        onUpdated={fetchConversations}
      />
    </div>
  );
}
