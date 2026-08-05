import { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Reply, Forward, Pin, PinOff, Smile, XCircle, MoreVertical } from 'lucide-react';
import { cn } from '../../lib/utils';

export function MessageActionMenu({ message, currentUser, onEdit, onDelete, onDeleteForEveryone, onReply, onPin, onUnpin, onReaction, onForward, onReport }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const menuRef = useRef(null);

  const isSender = message.senderId?.id === currentUser?.id;
  const isPinned = message.isPinned;
  const canEdit = isSender && !message.isDeleted;
  const canDelete = isSender || currentUser?.role === 'owner' || currentUser?.role === 'admin';
  const canPin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '✅', '❌', '⭐'];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReactionClick = (emoji) => {
    onReaction(emoji);
    setShowReactions(false);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          setShowReactions(false);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white transition cursor-pointer"
        title="Message actions"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1 z-50">
          {canEdit && (
            <button
              onClick={() => { onEdit(); setIsOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {onReply && (
            <button
              onClick={() => { onReply(); setIsOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <Reply className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
          )}

          {onForward && (
            <button
              onClick={() => { onForward(); setIsOpen(false); }}
              className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
            >
              <Forward className="w-3.5 h-3.5" />
              <span>Forward</span>
            </button>
          )}

          <button
            onClick={() => { setShowReactions(!showReactions); }}
            className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
          >
            <Smile className="w-3.5 h-3.5" />
            <span>React</span>
          </button>

          {showReactions && (
            <div className="px-3.5 py-2 border-t border-zinc-800">
              <div className="flex flex-wrap gap-1">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition cursor-pointer text-base"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {canPin && (
            <>
              {!isPinned ? (
                <button
                  onClick={() => { onPin(); setIsOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>Pin</span>
                </button>
              ) : (
                <button
                  onClick={() => { onUnpin(); setIsOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-white transition cursor-pointer"
                >
                  <PinOff className="w-3.5 h-3.5" />
                  <span>Unpin</span>
                </button>
              )}
            </>
          )}

          {onReport && !isSender && (
            <>
              <div className="h-px bg-zinc-800 my-1" />
              <button
                onClick={() => { onReport(); setIsOpen(false); }}
                className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 text-red-400 hover:bg-red-950/30 hover:text-red-300 transition cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Report</span>
              </button>
            </>
          )}

          {canDelete && (
            <>
              <div className="h-px bg-zinc-800 my-1" />
              <button
                onClick={() => { onDelete(); setIsOpen(false); }}
                className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 text-red-400 hover:bg-red-950/30 hover:text-red-300 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete for me</span>
              </button>
              {onDeleteForEveryone && (
                <button
                  onClick={() => { onDeleteForEveryone(); setIsOpen(false); }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 text-red-400 hover:bg-red-950/30 hover:text-red-300 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete for everyone</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}