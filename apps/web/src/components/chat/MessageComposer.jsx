import { useState, useRef, useCallback } from 'react';
import { Send, XCircle, RotateCcw, ArrowLeft, Edit2 } from 'lucide-react';
import { Button } from '../ui/Button';

export function MessageComposer({
  inputText,
  onInputChange,
  onSend,
  sending,
  failedMessages,
  onRetryFailed,
  disabled,
  placeholder = 'Type a message...',
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSubmitEdit,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingMessage) {
      onInputChange({ target: { value: editingMessage.content } });
      inputRef.current?.focus();
    }
  }, [editingMessage]); // Only run when editingMessage changes

  const handleRetry = useCallback((idempotencyKey) => {
    onRetryFailed(idempotencyKey);
  }, [onRetryFailed]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMessage && onSubmitEdit) {
      onSubmitEdit(editingMessage._id, inputText);
      onInputChange({ target: { value: '' } });
    } else {
      onSend(e);
    }
  };

  return (
    <div className="pt-3 border-t border-zinc-800/80 mt-2 shrink-0">
      {replyingTo && !editingMessage && (
        <div className="flex items-center justify-between px-2 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg mb-2">
          <div className="flex items-center space-x-2 text-xs text-indigo-400">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Replying to <strong>{replyingTo.senderId?.displayName || replyingTo.senderId?.username || 'Unknown'}</strong></span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-zinc-500 hover:text-white p-0.5 transition cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg mb-2">
          <div className="flex items-center space-x-2 text-xs text-zinc-300">
            <Edit2 className="w-3.5 h-3.5" />
            <span>Editing message</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onCancelEdit();
              onInputChange({ target: { value: '' } });
            }}
            className="text-zinc-500 hover:text-white p-0.5 transition cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {failedMessages.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2 py-2">
          {failedMessages.map((msg) => (
            <div
              key={msg.idempotencyKey}
              className="flex items-center space-x-2 bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-1.5 text-xs"
            >
              <span className="text-red-300 flex-1 truncate max-w-[200px]">
                {msg.content}
              </span>
              <button
                onClick={() => handleRetry(msg.idempotencyKey)}
                className="text-red-400 hover:text-red-300 p-0.5 transition cursor-pointer"
                title="Retry message"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                className="text-zinc-500 hover:text-zinc-300 p-0.5 transition cursor-pointer"
                title="Dismiss"
              >
                <XCircle className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={onInputChange}
          disabled={sending || disabled}
          placeholder={placeholder}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          isDisabled={!inputText.trim() || sending || disabled}
          isLoading={sending}
          leftIcon={<Send className="w-4 h-4" />}
        >
          {editingMessage ? 'Save' : 'Send'}
        </Button>
      </form>
    </div>
  );
}