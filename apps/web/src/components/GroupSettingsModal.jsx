import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { useAuthStore } from '../store/useAuthStore';
import { useToast } from './ui/Toast';
import {
  updateGroupRequest,
  removeMemberRequest,
  updateMemberRoleRequest,
  leaveGroupRequest,
  transferOwnershipRequest,
} from '../api/conversationApi';
import { Shield, ShieldAlert, UserMinus, LogOut, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function GroupSettingsModal({ isOpen, onClose, conversation, onUpdated }) {
  const { user: currentUser } = useAuthStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState(conversation?.name || '');
  const [description, setDescription] = useState(conversation?.description || '');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!conversation || conversation.type === 'direct') return null;

  const currentMemberInfo = conversation.members?.find((m) => {
    const mUserId = m.user?.id || (typeof m.userId === 'object' ? m.userId?.id : m.userId);
    return mUserId?.toString() === currentUser?.id?.toString();
  });
  const isOwner = currentMemberInfo?.role === 'owner';
  const isAdmin = currentMemberInfo?.role === 'admin' || isOwner;

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateGroupRequest(conversation.id, { name, description });
      addToast({ message: 'Group details updated!', type: 'success' });
      if (onUpdated) onUpdated(res.data.conversation);
    } catch (err) {
      addToast({ message: err.message || 'Failed to update group details', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    setActionLoading(true);
    try {
      await removeMemberRequest(conversation.id, targetUserId);
      addToast({ message: 'Member removed', type: 'info' });
      if (onUpdated) onUpdated();
    } catch (err) {
      addToast({ message: err.message || 'Failed to remove member', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdminRole = async (targetUserId, currentRole) => {
    setActionLoading(true);
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await updateMemberRoleRequest(conversation.id, targetUserId, { role: newRole });
      addToast({ message: `Role updated to ${newRole}`, type: 'success' });
      if (onUpdated) onUpdated();
    } catch (err) {
      addToast({ message: err.message || 'Failed to update role', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async (newOwnerId) => {
    setActionLoading(true);
    try {
      await transferOwnershipRequest(conversation.id, { newOwnerId });
      addToast({ message: 'Ownership transferred!', type: 'success' });
      if (onUpdated) onUpdated();
    } catch (err) {
      addToast({ message: err.message || 'Failed to transfer ownership', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    setActionLoading(true);
    try {
      await leaveGroupRequest(conversation.id);
      addToast({ message: 'You left the group channel', type: 'info' });
      onClose();
      navigate('/');
      if (onUpdated) onUpdated();
    } catch (err) {
      addToast({ message: err.message || 'Failed to leave group', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Group Settings — ${conversation.name}`}>
      <div className="space-y-6">
        {/* Edit Group Info (Admin/Owner only) */}
        {isAdmin ? (
          <form onSubmit={handleUpdateDetails} className="space-y-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Edit Group Info</h4>
            <Input label="Group Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-300">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-lg text-xs p-2 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" isLoading={saving}>
                Save Details
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <h4 className="text-sm font-bold text-white">{conversation.name}</h4>
            {conversation.description && <p className="text-xs text-zinc-400">{conversation.description}</p>}
          </div>
        )}

        {/* Member Management List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Members ({conversation.members?.length || 0})
          </h4>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {conversation.members?.map((m) => {
              const u = m.user || (typeof m.userId === 'object' ? m.userId : null) || { username: 'Unknown', displayName: 'Unknown' };
              const uId = u.id || (typeof m.userId === 'string' ? m.userId : '');
              const isSelf = uId === currentUser?.id;

              return (
                <div
                  key={uId}
                  className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Avatar name={u.displayName || u.username} src={u.avatarUrl} status={u.status} size="sm" />
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-200 truncate flex items-center space-x-1.5">
                        <span>{u.displayName || u.username}</span>
                        {m.role === 'owner' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold border border-amber-500/30">
                            Owner
                          </span>
                        )}
                        {m.role === 'admin' && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 rounded font-bold border border-indigo-500/30">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">@{u.username}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isSelf && (
                    <div className="flex items-center space-x-1">
                      {isOwner && m.role !== 'owner' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleAdminRole(uId, m.role)}
                            disabled={actionLoading}
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                            title={m.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                          >
                            {m.role === 'admin' ? <ShieldAlert className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5 text-indigo-400" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTransferOwnership(uId)}
                            disabled={actionLoading}
                            className="p-1 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition cursor-pointer"
                            title="Transfer Ownership"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {isAdmin && (isOwner || m.role === 'member') && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(uId)}
                          disabled={actionLoading}
                          className="p-1 rounded text-red-400 hover:bg-red-950/60 transition cursor-pointer"
                          title="Remove member"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave Group Button */}
        <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
          <Button
            variant="danger"
            size="sm"
            isLoading={actionLoading}
            onClick={handleLeaveGroup}
            leftIcon={<LogOut className="w-3.5 h-3.5" />}
          >
            Leave Group Channel
          </Button>

          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
