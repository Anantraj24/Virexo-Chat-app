import { usePreferencesStore } from '../store/usePreferencesStore';
import { Sun, Moon, Laptop, Eye, Bell } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function SettingsPage() {
  const { theme, setTheme, reducedMotion, setReducedMotion } = usePreferencesStore();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-zinc-800/80 pb-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Application Preferences</h2>
        <p className="text-xs text-zinc-400 mt-1">Manage themes, animations, and notification settings.</p>
      </div>

      {/* Theme Selection */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
          <Sun className="w-4 h-4 text-indigo-400" />
          <span>Appearance Theme</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border flex flex-col items-center space-y-2 text-xs font-medium transition cursor-pointer ${
              theme === 'dark'
                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span>Dark Theme</span>
          </button>

          <button
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border flex flex-col items-center space-y-2 text-xs font-medium transition cursor-pointer ${
              theme === 'light'
                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-400" />
            <span>Light Theme</span>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border flex flex-col items-center space-y-2 text-xs font-medium transition cursor-pointer ${
              theme === 'system'
                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Laptop className="w-5 h-5 text-blue-400" />
            <span>System Default</span>
          </button>
        </div>
      </div>

      {/* Motion & Accessibility Settings */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
          <Eye className="w-4 h-4 text-purple-400" />
          <span>Accessibility & Motion</span>
        </h3>

        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
          <div>
            <div className="text-xs font-semibold text-zinc-200">Reduced Motion</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Minimize non-essential animations and transitions.
            </div>
          </div>

          <Button
            variant={reducedMotion ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setReducedMotion(!reducedMotion)}
          >
            {reducedMotion ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      </div>

      {/* Notifications Placeholder */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
          <Bell className="w-4 h-4 text-emerald-400" />
          <span>Notification Badges</span>
        </h3>
        <p className="text-xs text-zinc-400">Desktop sound and web push notifications will be configured in Phase 7.</p>
      </div>
    </div>
  );
}
