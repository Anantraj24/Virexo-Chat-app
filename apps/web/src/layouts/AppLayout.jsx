import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
import { NotificationBell } from '../components/notifications/NotificationBell';
import { useGlobalSocket } from '../hooks/useGlobalSocket';
import {
  Home,
  Mail,
  Users,
  Calendar,
  Target,
  LayoutGrid,
  Network,
  ClipboardList,
  Settings,
  LogOut,
  SlidersHorizontal,
  HelpCircle,
  Sun,
  Moon,
  Laptop,
  Search,
  MoreHorizontal,
  ChevronDown,
  ShieldAlert,
  AlertTriangle,
  Menu,
  X,
  Plus
} from 'lucide-react';

export function AppLayout() {
  const { theme, setTheme } = usePreferencesStore();
  const { user, clearAuth } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useGlobalSocket();

  const [resendingEmail, setResendingEmail] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activeGroupSettings, setActiveGroupSettings] = useState(null);

  // Active inbox section state
  const [activeFolder, setActiveFolder] = useState('Chats');

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
      ? [{ label: 'Admin Dashboard', icon: <ShieldAlert className="w-3.5 h-3.5" />, onClick: () => navigate('/admin') }]
      : []),
    { divider: true },
    { label: 'Sign Out All Devices', icon: <LogOut className="w-3.5 h-3.5" />, danger: true, onClick: handleLogoutAll },
    { label: 'Sign Out', icon: <LogOut className="w-3.5 h-3.5" />, danger: true, onClick: handleLogout },
  ];

  return (
    <div className="h-screen w-screen bg-[#edf2f7] dark:bg-zinc-950 p-2 sm:p-3 overflow-hidden flex flex-col font-sans select-none">
      {/* Outer Card Container with rounded corners & shadow matching reference UI */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden min-h-0">
        
        {/* Top Header Bar matching screenshot */}
        <header className="h-14 px-4 border-b border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0">
          {/* Left: Brand Icon + Search Bar with Filter Sliders */}
          <div className="flex items-center space-x-4 flex-1 max-w-xl">
            {/* Logo Mark matching screenshot */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <a href="/" className="flex items-center">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  V
                </div>
              </a>
            </div>

            {/* Search Input with Sliders Icon */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search"
                onClick={() => setSearchModalOpen(true)}
                readOnly
                className="w-full bg-slate-50 dark:bg-zinc-800/60 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 pl-8 pr-8 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 focus:outline-none cursor-pointer"
              />
              <button
                onClick={() => setSearchModalOpen(true)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: Setup Guide Dropdown + Notification Bell + Help */}
          <div className="flex items-center space-x-2.5">
            <button className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition cursor-pointer">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Setup guide</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            <NotificationBell />

            <Dropdown
              trigger={
                <button className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer" title="Theme">
                  {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              }
              items={themeItems}
            />

            <button className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer" title="Help">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Verification banner if applicable */}
        {user && !user.isEmailVerified && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200/80 dark:border-amber-800/60 px-4 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Please verify your email address to unlock full features.</span>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="text-amber-700 dark:text-amber-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
            >
              {resendingEmail ? 'Sending...' : 'Resend Email'}
            </button>
          </div>
        )}

        {/* Multi-Column Main Workspace */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          
          {/* Column 1: Ultra-narrow Icon Dock (~60px) matching screenshot */}
          <aside className="w-14 border-r border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex flex-col items-center py-4 justify-between shrink-0">
            {/* Top Navigation Icons */}
            <div className="flex flex-col items-center space-y-4">
              <button 
                onClick={() => navigate('/')}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer" 
                title="Home"
              >
                <Home className="w-4 h-4" />
              </button>

              <button 
                onClick={() => navigate('/')}
                className="p-2 rounded-xl text-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 dark:text-indigo-400 transition cursor-pointer shadow-2xs" 
                title="Messages"
              >
                <Mail className="w-4 h-4" />
              </button>

              <button 
                onClick={() => setDmModalOpen(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer" 
                title="Contacts"
              >
                <Users className="w-4 h-4" />
              </button>

              <button className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer" title="Calendar">
                <Calendar className="w-4 h-4" />
              </button>

              <button className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer" title="Analytics">
                <Target className="w-4 h-4" />
              </button>

              <button className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer" title="Apps">
                <LayoutGrid className="w-4 h-4" />
              </button>

              <button className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer" title="Integrations">
                <Network className="w-4 h-4" />
              </button>

              <button className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer" title="Tasks">
                <ClipboardList className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Controls: Settings, LogOut, and User Avatar */}
            <div className="flex flex-col items-center space-y-3">
              <button 
                onClick={() => navigate('/settings')}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer" 
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 transition cursor-pointer" 
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* User Avatar with Green Online Dot */}
              <Dropdown
                trigger={
                  <div className="relative cursor-pointer">
                    <Avatar
                      name={user?.displayName || user?.username || 'User'}
                      src={user?.avatarUrl}
                      status="online"
                      size="sm"
                      className="w-7 h-7 text-xs"
                    />
                  </div>
                }
                items={userMenuItems}
                align="left"
              />
            </div>
          </aside>

          {/* Column 2: Inbox & Channels Sub-Sidebar (~220px) matching screenshot */}
          <aside className={`w-56 border-r border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex flex-col py-4 px-3 shrink-0 overflow-y-auto ${mobileMenuOpen ? 'block' : 'hidden lg:flex'}`}>
            {/* Inbox Title & Email */}
            <div className="flex items-center justify-between px-2 mb-3">
              <div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                  Inbox
                </h3>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  {user?.email || 'wilson@gmail.com'}
                </p>
              </div>
              <button className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Folder Items */}
            <div className="space-y-0.5 mb-6 text-xs">
              {[
                { label: 'Email', badge: 4, icon: Mail },
                { label: 'Chats', badge: 6, icon: null },
                { label: 'Scheduled', badge: 1, icon: null },
                { label: 'Assigned', badge: null, icon: null },
                { label: 'Closed', badge: null, icon: null },
                { label: 'Starred', badge: null, icon: null },
                { label: 'Archived', badge: null, icon: null },
              ].map((folder) => {
                const isActive = activeFolder === folder.label;
                return (
                  <button
                    key={folder.label}
                    onClick={() => setActiveFolder(folder.label)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition cursor-pointer text-left ${
                      isActive
                        ? 'bg-slate-100/90 dark:bg-zinc-800 font-semibold text-slate-900 dark:text-zinc-100'
                        : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <span>{folder.label}</span>
                    {folder.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-semibold">
                        {folder.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Channels Section */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-400 uppercase tracking-wider flex items-center space-x-1">
                  <ChevronDown className="w-3 h-3" />
                  <span>Channels</span>
                </span>
                <button
                  onClick={() => setGroupModalOpen(true)}
                  className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition"
                  title="Create channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {[
                { name: 'Gmail', badge: 4, color: '#EA4335' },
                { name: 'Telegram', badge: 2, color: '#0088CC' },
                { name: 'WhatsApp', badge: 2, color: '#25D366' },
                { name: 'Messenger', badge: 3, color: '#0084FF' },
                { name: 'Messenger', badge: 1, color: '#0084FF' },
              ].map((channel, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: channel.color }}
                    />
                    <span>{channel.name}</span>
                  </div>
                  {channel.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 font-medium">
                      {channel.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </aside>

          {/* Column 3: Messages List (~320px) matching screenshot */}
          <ConversationList
            conversations={conversations}
            currentUserId={user?.id}
            loading={loadingConversations}
            onNewChat={() => setDmModalOpen(true)}
          />

          {/* Column 4 & 5: Center Chat & Right Details Drawer */}
          <main className="flex-1 flex min-w-0 bg-white dark:bg-zinc-900 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Modals */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        conversations={conversations}
        currentUserId={user?.id}
      />

      <NewDMModal
        isOpen={dmModalOpen}
        onClose={() => setDmModalOpen(false)}
        onCreated={(newConv) => {
          setConversations((prev) => [newConv, ...prev.filter(c => c.id !== newConv.id)]);
          navigate(`/dms/${newConv.id}`);
        }}
      />

      <CreateGroupModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onCreated={(newGroup) => {
          setConversations((prev) => [newGroup, ...prev.filter(c => c.id !== newGroup.id)]);
          navigate(`/channels/${newGroup.id}`);
        }}
      />

      {activeGroupSettings && (
        <GroupSettingsModal
          isOpen={!!activeGroupSettings}
          onClose={() => setActiveGroupSettings(null)}
          conversation={activeGroupSettings}
          currentUser={user}
          onUpdated={(updatedConv) => {
            setConversations((prev) => prev.map(c => c.id === updatedConv.id ? updatedConv : c));
          }}
        />
      )}
    </div>
  );
}