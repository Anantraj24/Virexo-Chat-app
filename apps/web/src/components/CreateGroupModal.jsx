import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Spinner } from './ui/Spinner';
import { searchUsersRequest } from '../api/userApi';
import { createGroupRequest } from '../api/conversationApi';
import { useToast } from './ui/Toast';
import { Search, Plus, X, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setMemberSearch('');
      setSearchResults([]);
      setSelectedMembers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!memberSearch.trim()) {
      setSearchResults([]);
      return;
    }

    setLoadingSearch(true);
    const timer = setTimeout(() => {
      searchUsersRequest(memberSearch)
        .then((res) => {
          setSearchResults(res.data.users || []);
        })
        .catch(() => {
          setSearchResults([]);
        })
        .finally(() => {
          setLoadingSearch(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearch]);

  const toggleSelectMember = (user) => {
    if (selectedMembers.some((m) => m._id === user._id)) {
      setSelectedMembers(selectedMembers.filter((m) => m._id !== user._id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const memberIds = selectedMembers.map((m) => m._id);
      const res = await createGroupRequest({ name, description, memberIds });
      const group = res.data.conversation;

      addToast({ message: `Group channel "${group.name}" created!`, type: 'success' });
      if (onGroupCreated) onGroupCreated(group);
      onClose();
      navigate(`/channels/${group._id}`);
    } catch (err) {
      addToast({ message: err.message || 'Failed to create group channel', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Group Channel"
      description="Start a multi-user group channel for team discussions."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isDisabled={!name.trim()}
            isLoading={submitting}
            onClick={handleCreateGroup}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Group
          </Button>
        </>
      }
    >
      <form onSubmit={handleCreateGroup} className="space-y-4">
        <Input
          label="Group Name"
          placeholder="e.g. general-devs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Description (Optional)</label>
          <textarea
            rows={2}
            placeholder="Channel topic or purpose..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 border border-zinc-800 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Member Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
            <span>Add Members ({selectedMembers.length})</span>
            <Users className="w-3.5 h-3.5 text-zinc-500" />
          </label>

          {/* Selected Chips */}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800">
              {selectedMembers.map((user) => (
                <span
                  key={user._id}
                  className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs"
                >
                  <span>{user.username}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectMember(user)}
                    className="hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <Input
            placeholder="Search members to add..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />

          {/* Search Dropdown Results */}
          {memberSearch.trim() && (
            <div className="max-h-40 overflow-y-auto space-y-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
              {loadingSearch ? (
                <div className="py-4 flex justify-center">
                  <Spinner size="sm" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => {
                  const isSelected = selectedMembers.some((m) => m._id === user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleSelectMember(user)}
                      className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-600/20 text-indigo-300'
                          : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Avatar name={user.username} src={user.avatarUrl} size="xs" />
                        <span>@{user.username}</span>
                      </div>
                      {isSelected ? <span className="text-[10px] font-bold text-indigo-400">Added</span> : <Plus className="w-3.5 h-3.5" />}
                    </div>
                  );
                })
              ) : (
                <div className="py-3 text-center text-xs text-zinc-500">No members found</div>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
