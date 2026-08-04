import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
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
import SearchModal from '../components/SearchModal';
import { ConversationList } from '../components/chat/ConversationList';
import {
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  Laptop,
  Search,
  Bell,
  LogOut,
  ShieldAlert,
  AlertTriangle,
  Mail,
} from 'lucide-react';

export function AppLayout() {
  const { theme, setTheme, sidebarOpen, toggleSidebar, setSidebarOpen } = usePreferencesStore();
  const { user, clearAuth } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [resendingEmail, setResendingEmail] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activeGroupSettings, setActiveGroupSettings] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
          <a href="/" className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              V
            </div>
            <span className="font-bold text-sm tracking-tight text-white">{APP_NAME} Community</span>
          </a>

          <button
            onClick={toggleSidebar}
            className="md:hidden text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-3 pt-3 pb-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Channels</span>
              <button
                onClick={() => setGroupModalOpen(true)}
                className="hover:text-white p-0.5 rounded transition cursor-pointer"
                title="Create Group Channel"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">DMs</span>
              <button
                onClick={() => setDmModalOpen(true)}
                className="hover:text-white p-0.5 rounded transition cursor-pointer"
                title="New Direct Message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <ConversationList
            conversations={conversations}
            currentUserId={user?._id}
            loading={loadingConversations}
            searchQuery=""
          />
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

            <a
              href="/settings"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </a>
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
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
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
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </main>
      </div>

      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onJumpToMessage={(conversationId, messageId) => {
          setSearchModalOpen(false);
          // Navigate to channel with jump params (will be handled by useChat)
          navigate(`/channels/${conversationId}?jumpTo=${messageId}`);
        }}
        onStartConversation={async (targetId, isConversationId = false) => {
          setSearchModalOpen(false);
          if (isConversationId) {
            navigate(`/channels/${targetId}`);
          } else {
            // Need to start DM or navigate to existing
            try {
              const res = await api.post('/conversations/direct', { partnerId: targetId });
              await fetchConversations();
              navigate(`/dms/${res.data.conversation._id}`);
            } catch (err) {
              addToast({ message: err.response?.data?.message || 'Failed to start conversation', type: 'error' });
            }
          }
        }}
      />

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