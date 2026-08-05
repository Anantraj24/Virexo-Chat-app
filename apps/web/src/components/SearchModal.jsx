import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  MessageSquare, 
  Users, 
  Hash, 
  Loader2, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Mic 
} from 'lucide-react';
import { apiClient as api } from '../api/axiosClient';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

const TABS = [
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'conversations', label: 'Conversations', icon: Hash },
];

export default function SearchModal({ isOpen, onClose, onJumpToMessage, onStartConversation }) {
  const [activeTab, setActiveTab] = useState('messages');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ messages: [], users: [], conversations: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const inputRef = useRef(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults({ messages: [], users: [], conversations: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchResults = useCallback(async (searchQuery, tab) => {
    if (!searchQuery.trim()) {
      setResults(prev => ({ ...prev, [tab]: [] }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/search/${tab}`, { params: { q: searchQuery, limit: 20 } });
      setResults(prev => ({ ...prev, [tab]: response.data.data[tab] || response.data.data.messages || response.data.data.users || response.data.data.conversations || [] }));
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        fetchResults(query, activeTab);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [query, activeTab, fetchResults]);

  // Prevent closing when clicking inside the modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const parts = text.toString().split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={index} className="bg-primary/20 text-primary-light font-medium">{part}</span> : part
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-20 pb-4 px-4 bg-background/80 backdrop-blur-sm sm:px-6 md:px-20"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl bg-surface border border-surface-light rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Search Input Header */}
            <div className="flex items-center px-4 py-3 border-b border-surface-light relative">
              <Search className="w-5 h-5 text-text-muted absolute left-4" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search messages, users, or conversations..."
                className="w-full bg-transparent border-none focus:ring-0 text-text pl-10 pr-10 py-2 text-lg outline-none placeholder:text-text-muted"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="absolute right-12 p-1 text-text-muted hover:text-text transition-colors rounded-full hover:bg-surface-light"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="absolute right-4 text-xs font-medium text-text-muted border border-surface-light rounded px-1.5 py-0.5 bg-surface">
                ESC
              </div>
            </div>

            {/* Tabs */}
            <div className="flex px-4 pt-2 border-b border-surface-light gap-4 shrink-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-1 pb-3 text-sm font-medium transition-colors relative",
                      isActive ? "text-primary" : "text-text-muted hover:text-text"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin min-h-[300px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-muted gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p>Searching...</p>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-error bg-error/10 rounded-lg m-2">
                  {error}
                </div>
              ) : !query.trim() ? (
                <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                  <Search className="w-12 h-12 mb-4 opacity-20" />
                  <p>Type to start searching...</p>
                </div>
              ) : results[activeTab]?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                  <p>No results found for &quot;{query}&quot;</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activeTab === 'messages' && results.messages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => {
                        onJumpToMessage(msg.conversationId?.id || msg.conversationId, msg.id);
                        onClose();
                      }}
                      className="w-full text-left p-3 hover:bg-surface-light rounded-lg transition-colors flex gap-3 group"
                    >
                      <img 
                        src={msg.senderId?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderId?.displayName || 'User')}&background=random`} 
                        alt={msg.senderId?.displayName} 
                        className="w-10 h-10 rounded-full shrink-0 mt-1 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="font-medium text-sm text-text truncate">
                            {msg.senderId?.displayName}
                            {msg.conversationId?.type === 'group' && (
                              <span className="text-text-muted font-normal ml-1">in {msg.conversationId?.name}</span>
                            )}
                          </span>
                          <span className="text-xs text-text-muted shrink-0">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">
                          {highlightText(msg.content, query)}
                        </p>
                      </div>
                    </button>
                  ))}

                  {activeTab === 'users' && results.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        onStartConversation(u.id);
                        onClose();
                      }}
                      className="w-full text-left p-3 hover:bg-surface-light rounded-lg transition-colors flex items-center gap-3"
                    >
                      <div className="relative">
                        <img 
                          src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random`} 
                          alt={u.displayName} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {u.status === 'online' && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text text-sm truncate">{highlightText(u.displayName, query)}</p>
                        <p className="text-xs text-text-muted truncate">@{highlightText(u.username, query)}</p>
                      </div>
                    </button>
                  ))}

                  {activeTab === 'conversations' && results.conversations.map((conv) => {
                    const isGroup = conv.type === 'group';
                    const otherMember = !isGroup ? conv.members.find(m => m.userId?.id !== user?.id)?.userId : null;
                    
                    const avatarUrl = isGroup 
                      ? (conv.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.name || 'Group')}&background=random`)
                      : (otherMember?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherMember?.displayName || 'User')}&background=random`);
                    
                    const name = isGroup ? conv.name : otherMember?.displayName || 'Unknown User';

                    return (
                      <button
                        key={conv.id}
                        onClick={() => {
                          onStartConversation(conv.id, true);
                          onClose();
                        }}
                        className="w-full text-left p-3 hover:bg-surface-light rounded-lg transition-colors flex items-center gap-3"
                      >
                        <img 
                          src={avatarUrl} 
                          alt={name} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-text text-sm truncate">{highlightText(name, query)}</p>
                          {isGroup && (
                            <p className="text-xs text-text-muted truncate">{conv.members.length} members</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
