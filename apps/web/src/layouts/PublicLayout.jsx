import { Outlet, Link } from 'react-router-dom';
import { APP_NAME } from '@virexo/shared';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { Sun, Moon, Laptop } from 'lucide-react';
import { Dropdown } from '../components/ui/Dropdown';

export function PublicLayout() {
  const { theme, setTheme } = usePreferencesStore();

  const themeItems = [
    { label: 'Light Theme', icon: <Sun className="w-3.5 h-3.5" />, onClick: () => setTheme('light') },
    { label: 'Dark Theme', icon: <Moon className="w-3.5 h-3.5" />, onClick: () => setTheme('dark') },
    { label: 'System Default', icon: <Laptop className="w-3.5 h-3.5" />, onClick: () => setTheme('system') },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Public Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg group-hover:scale-105 transition">
              V
            </div>
            <span className="text-lg font-bold tracking-tight text-white">{APP_NAME}</span>
          </Link>

          <div className="flex items-center space-x-3">
            <Dropdown
              trigger={
                <button className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer">
                  {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              }
              items={themeItems}
            />

            <Link
              to="/login"
              className="text-xs font-semibold text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm border border-indigo-500/30 transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Public Page Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 text-xs text-zinc-500 py-6 text-center">
        © 2026 {APP_NAME} Real-Time Messaging Platform • All rights reserved.
      </footer>
    </div>
  );
}
