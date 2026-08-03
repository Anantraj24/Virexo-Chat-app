import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useToast } from '../components/ui/Toast';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import {
  updateProfileRequest,
  updatePrivacyRequest,
  updateNotificationsRequest,
  checkUsernameRequest,
} from '../api/userApi';
import {
  User,
  Sun,
  Moon,
  Laptop,
  Eye,
  Shield,
  Bell,
  Upload,
  CheckCircle2,
  AlertCircle,
  Volume2,
  AtSign,
  Mail,
  Smartphone,
} from 'lucide-react';

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, setTheme, reducedMotion, setReducedMotion } = usePreferencesStore();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile'); // profile | appearance | privacy | notifications

  // Profile Form State
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [usernameStatus, setUsernameStatus] = useState(null); // null | checking | available | taken
  const [savingProfile, setSavingProfile] = useState(false);

  // Privacy Settings State
  const [showOnlineStatus, setShowOnlineStatus] = useState(
    user?.privacySettings?.showOnlineStatus ?? true
  );
  const [showLastSeen, setShowLastSeen] = useState(
    user?.privacySettings?.showLastSeen ?? true
  );
  const [allowDirectMessages, setAllowDirectMessages] = useState(
    user?.privacySettings?.allowDirectMessages || 'everyone'
  );
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Notification Settings State
  const [emailNotifications, setEmailNotifications] = useState(
    user?.notificationSettings?.emailNotifications ?? true
  );
  const [desktopNotifications, setDesktopNotifications] = useState(
    user?.notificationSettings?.desktopNotifications ?? true
  );
  const [soundEnabled, setSoundEnabled] = useState(
    user?.notificationSettings?.soundEnabled ?? true
  );
  const [notifyOnMention, setNotifyOnMention] = useState(
    user?.notificationSettings?.notifyOnMention ?? true
  );
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Real-time username availability check (debounced)
  useEffect(() => {
    if (!username || username === user?.username) {
      setUsernameStatus(null);
      return;
    }

    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(() => {
      checkUsernameRequest(username)
        .then((res) => {
          if (res.data.isAvailable) {
            setUsernameStatus('available');
          } else {
            setUsernameStatus('taken');
          }
        })
        .catch(() => setUsernameStatus(null));
    }, 400);

    return () => clearTimeout(timer);
  }, [username, user?.username]);

  // Local Avatar FileReader preview
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast({ message: 'Image file size must be less than 5MB', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result || '');
      addToast({ message: 'Avatar preview updated locally', type: 'info' });
    };
    reader.readAsDataURL(file);
  };

  // Save Profile Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await updateProfileRequest({
        username,
        displayName,
        bio,
        avatarUrl: avatarPreview,
      });

      setUser(res.data.user);
      addToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (err) {
      addToast({ message: err.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Privacy Handler
  const handleSavePrivacy = async (e) => {
    e.preventDefault();
    setSavingPrivacy(true);

    try {
      const res = await updatePrivacyRequest({
        showOnlineStatus,
        showLastSeen,
        allowDirectMessages,
      });

      if (user) {
        setUser({ ...user, privacySettings: res.data.privacySettings });
      }
      addToast({ message: 'Privacy settings saved!', type: 'success' });
    } catch (err) {
      addToast({ message: err.message || 'Failed to save privacy settings', type: 'error' });
    } finally {
      setSavingPrivacy(false);
    }
  };

  // Save Notifications Handler
  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    setSavingNotifications(true);

    try {
      const res = await updateNotificationsRequest({
        emailNotifications,
        desktopNotifications,
        soundEnabled,
        notifyOnMention,
      });

      if (user) {
        setUser({ ...user, notificationSettings: res.data.notificationSettings });
      }
      addToast({ message: 'Notification preferences saved!', type: 'success' });
    } catch (err) {
      addToast({ message: err.message || 'Failed to save notification preferences', type: 'error' });
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Account & Preferences</h2>
        <p className="text-xs text-zinc-400 mt-1">
          Manage your public profile, appearance, privacy, and notification settings.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800/80 space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
            activeTab === 'profile'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Account</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
            activeTab === 'appearance'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('privacy')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
            activeTab === 'privacy'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Privacy & Security</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
            activeTab === 'notifications'
              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>
      </div>

      {/* Tab Content Panels */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar Section */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Avatar Image</h3>

            <div className="flex items-center space-x-5">
              <Avatar
                name={displayName || username || 'User'}
                src={avatarPreview}
                size="xl"
                status="online"
              />

              <div className="space-y-2">
                <label className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Choose Image File...</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </label>
                <p className="text-[11px] text-zinc-500">
                  Temporary local preview (JPG, PNG, GIF, WebP. Max 5MB).
                </p>
              </div>
            </div>
          </div>

          {/* Profile Details Section */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Personal Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  leftIcon={<AtSign className="w-4 h-4" />}
                  required
                />
                {usernameStatus === 'checking' && (
                  <span className="text-[11px] text-zinc-400 mt-1 block">Checking availability...</span>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Username is available!</span>
                  </span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="text-[11px] text-red-400 mt-1 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Username is already taken</span>
                  </span>
                )}
              </div>

              <Input
                label="Display Name"
                placeholder="e.g. Alex Rivera"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Bio</label>
              <textarea
                rows={3}
                maxLength={200}
                placeholder="Tell the community a little about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 border border-zinc-800 rounded-lg text-sm p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
              <div className="text-[11px] text-zinc-500 text-right">{bio.length}/200</div>
            </div>
          </div>

          {/* Account Details Read-Only */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Account Credentials</h3>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-zinc-800">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-xs font-semibold text-zinc-200">{user?.email}</div>
                  <div className="text-[11px] text-zinc-500">
                    {user?.isEmailVerified ? (
                      <span className="text-emerald-400 font-medium">Verified Email</span>
                    ) : (
                      <span className="text-amber-400 font-medium">Unverified Email</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={savingProfile}
              isDisabled={usernameStatus === 'taken' || usernameStatus === 'invalid'}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <Sun className="w-4 h-4 text-indigo-400" />
              <span>Appearance Theme</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
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
                type="button"
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
                type="button"
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

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <Eye className="w-4 h-4 text-purple-400" />
              <span>Accessibility & Motion</span>
            </h3>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800">
              <div>
                <div className="text-xs font-semibold text-zinc-200">Reduced Motion</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Minimize non-essential animations and layout transitions.
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
        </div>
      )}

      {activeTab === 'privacy' && (
        <form onSubmit={handleSavePrivacy} className="space-y-6">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Privacy Controls</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Show Online Status</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Allow other community members to see when you are active.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showOnlineStatus}
                  onChange={(e) => setShowOnlineStatus(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Show Last Seen Timestamp</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Display your last active timestamp on your public profile card.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showLastSeen}
                  onChange={(e) => setShowLastSeen(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 space-y-2">
                <div className="text-xs font-semibold text-zinc-200">Direct Message Permissions</div>
                <div className="text-[11px] text-zinc-500">
                  Control who can initiate direct messaging conversations with you.
                </div>
                <select
                  value={allowDirectMessages}
                  onChange={(e) => setAllowDirectMessages(e.target.value)}
                  className="w-full bg-zinc-900 text-xs text-zinc-200 border border-zinc-800 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="everyone">Everyone in community</option>
                  <option value="friends">Friends / Shared Channels only</option>
                  <option value="none">Nobody (Disable incoming DMs)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={savingPrivacy}>
              Save Privacy Settings
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="space-y-6">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span>Notification Preferences</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Email Digest Notifications</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Receive email updates for missed direct messages and channel activity.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Desktop Push Notifications</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Show system popups when new messages arrive.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={desktopNotifications}
                  onChange={(e) => setDesktopNotifications(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Sound Alerts</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Play audio chime for incoming messages and mentions.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <AtSign className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Notify Only On @Mentions</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      Suppress alerts unless you are explicitly tagged in a message.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyOnMention}
                  onChange={(e) => setNotifyOnMention(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="primary" isLoading={savingNotifications}>
              Save Notification Preferences
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
