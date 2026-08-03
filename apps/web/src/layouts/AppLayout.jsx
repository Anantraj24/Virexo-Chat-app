import { Outlet, NavLink, Link } from 'react-router-dom';
import { APP_NAME } from '@virexo/shared';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { Avatar } from '../components/ui/Avatar';
import { Dropdown } from '../components/ui/Dropdown';
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
} from 'lucide-react';

export function AppLayout() {
  const { theme, setTheme, sidebarOpen, toggleSidebar, setSidebarOpen } = usePreferencesStore();

  const themeItems = [
    { label: 'Light Mode', icon: <Sun className="w-3.5 h-3.5" />, onClick: () => setTheme('light') },
    { label: 'Dark Mode', icon: <Moon className="w-3.5 h-3.5" />, onClick: () => setTheme('dark') },
    { label: 'System Default', icon: <Laptop className="w-3.5 h-3.5" />, onClick: () => setTheme('system') },
  ];

  const userMenuItems = [
    { label: 'Settings', icon: <Settings className="w-3.5 h-3.5" />, onClick: () => {} },
    { label: 'Admin Dashboard', icon: <ShieldAlert className="w-3.5 h-3.5" />, onClick: () => {} },
    { divider: true },
    { label: 'Sign Out', icon: <LogOut className="w-3.5 h-3.5" />, danger: true, onClick: () => {} },
  ];

  const mockChannels = [
    { id: 'general', name: 'general', type: 'public' },
    { id: 'announcements', name: 'announcements', type: 'public' },
    { id: 'dev-chat', name: 'dev-chat', type: 'private' },
  ];

  const mockDMs = [
    { id: 'alex', name: 'Alex Rivera', status: 'online' },
    { id: 'sarah', name: 'Sarah Chen', status: 'away' },
    { id: 'jordan', name: 'Jordan Vance', status: 'offline' },
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
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
              V
            </div>
            <span className="font-bold text-sm tracking-tight text-white">{APP_NAME} Community</span>
          </Link>

          <button
            onClick={toggleSidebar}
            className="md:hidden text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          {/* Channels Section */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-1.5">
              <span>Channels</span>
              <button className="hover:text-white p-0.5 rounded transition cursor-pointer" title="Create channel">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <nav className="space-y-0.5">
              {mockChannels.map((channel) => (
                <NavLink
                  key={channel.id}
                  to={`/channels/${channel.id}`}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`
                  }
                >
                  <Hash className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  <span className="truncate">{channel.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Direct Messages Section */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-2 mb-1.5">
              <span>Direct Messages</span>
              <button className="hover:text-white p-0.5 rounded transition cursor-pointer" title="New message">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <nav className="space-y-0.5">
              {mockDMs.map((dm) => (
                <NavLink
                  key={dm.id}
                  to={`/dms/${dm.id}`}
                  className={({ isActive }) =>
                    `flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`
                  }
                >
                  <Avatar name={dm.name} size="xs" status={dm.status} />
                  <span className="truncate">{dm.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* User Profile & Theme Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 shrink-0 flex items-center justify-between">
          <Dropdown
            trigger={
              <div className="flex items-center space-x-2.5 p-1 rounded-lg hover:bg-zinc-800/60 transition group text-left">
                <Avatar name="Senior Engineer" status="online" size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white">
                    Senior Engineer
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">@senioreng</div>
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
    </div>
  );
}
