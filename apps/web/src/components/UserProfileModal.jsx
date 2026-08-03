import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Avatar } from './ui/Avatar';
import { Spinner } from './ui/Spinner';
import { getUserProfileRequest } from '../api/userApi';
import { Calendar, Shield, MessageSquare, CheckCircle2 } from 'lucide-react';

export function UserProfileModal({ isOpen, onClose, userIdOrUsername }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !userIdOrUsername) return;

    let isMounted = true;
    setLoading(true);
    setError('');

    getUserProfileRequest(userIdOrUsername)
      .then((res) => {
        if (isMounted) {
          setProfile(res.data.user);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load profile.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userIdOrUsername]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Profile">
      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-2">
          <Spinner size="lg" />
          <p className="text-xs text-zinc-500">Loading user profile...</p>
        </div>
      ) : error ? (
        <div className="py-6 text-center text-xs text-red-400 font-medium">{error}</div>
      ) : profile ? (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center space-x-4">
            <Avatar
              name={profile.displayName || profile.username}
              src={profile.avatarUrl}
              status={profile.status}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white truncate">
                  {profile.displayName || profile.username}
                </h3>
                {profile.role === 'admin' && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold flex items-center space-x-1 border border-indigo-500/30">
                    <Shield className="w-3 h-3" />
                    <span>Admin</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-zinc-400 truncate">@{profile.username}</div>
              {profile.isEmailVerified && (
                <div className="mt-1 flex items-center space-x-1 text-[11px] text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Member</span>
                </div>
              )}
            </div>
          </div>

          {/* Bio Section */}
          {profile.bio && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">About</label>
              <p className="text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 leading-relaxed">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center space-x-2 text-zinc-400">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Joined</div>
                <div className="text-zinc-200 font-medium">
                  {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center space-x-2 text-zinc-400">
              <MessageSquare className="w-4 h-4 text-purple-400 shrink-0" />
              <div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold">Status</div>
                <div className="text-zinc-200 font-medium capitalize">{profile.status || 'offline'}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
