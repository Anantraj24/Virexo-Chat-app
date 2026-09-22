import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, XCircle, RotateCcw, ArrowLeft, Edit2, Paperclip, FileText, Image as ImageIcon, Film, Mic, Square, Trash2, Smile } from 'lucide-react';

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
  pendingAttachments = [],
  uploadAttachment,
  removePendingAttachment,
}) {
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (editingMessage) {
      onInputChange({ target: { value: editingMessage.content } });
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  const handleRetry = useCallback((idempotencyKey) => {
    onRetryFailed(idempotencyKey);
  }, [onRetryFailed]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      uploadAttachment(file);
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioChunksRef.current.length > 0) {
          const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
          uploadAttachment(file);
        }
        
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordingDuration(0);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingMessage && onSubmitEdit) {
      onSubmitEdit(editingMessage.id, inputText);
      onInputChange({ target: { value: '' } });
    } else {
      onSend(e);
    }
  };

  return (
    <div className="pt-2.5 pb-2.5 px-4 bg-[#202c33] dark:bg-[#202c33] border-t border-zinc-800/60 shrink-0">
      {replyingTo && !editingMessage && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#111b21] border-l-4 border-[#00a884] rounded-lg mb-2">
          <div className="flex items-center space-x-2 text-xs text-[#00a884]">
            <ArrowLeft className="w-3.5 h-3.5" />
            {(() => {
              const replySender = replyingTo.sender || (typeof replyingTo.senderId === 'object' ? replyingTo.senderId : null);
              return <span>Replying to <strong>{replySender?.displayName || replySender?.username || 'Unknown'}</strong></span>;
            })()}
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-zinc-400 hover:text-white p-0.5 transition cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {editingMessage && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#111b21] border-l-4 border-amber-400 rounded-lg mb-2">
          <div className="flex items-center space-x-2 text-xs text-amber-300">
            <Edit2 className="w-3.5 h-3.5" />
            <span>Editing message</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onCancelEdit();
              onInputChange({ target: { value: '' } });
            }}
            className="text-zinc-400 hover:text-white p-0.5 transition cursor-pointer"
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
            </div>
          ))}
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2 py-2 border-b border-zinc-800/40 mb-2">
          {pendingAttachments.map((att) => (
            <div key={att.clientId} className="relative group w-16 h-16 bg-[#111b21] rounded-lg overflow-hidden border border-zinc-700 flex items-center justify-center">
              {att.file.type.startsWith('image/') ? (
                <ImageIcon className="w-6 h-6 text-zinc-400" />
              ) : att.file.type.startsWith('video/') ? (
                <Film className="w-6 h-6 text-zinc-400" />
              ) : (
                <FileText className="w-6 h-6 text-zinc-400" />
              )}
              
              {att.uploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-white font-medium">{att.progress}%</div>
                  <div className="w-3/4 h-1 bg-zinc-700 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-[#00a884] transition-all duration-300" style={{ width: `${att.progress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => removePendingAttachment(att.clientId)}
                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-zinc-300 hover:text-white"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <button
          type="button"
          className="p-2 text-zinc-400 hover:text-zinc-200 rounded-full transition cursor-pointer"
          title="Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || disabled || editingMessage}
          className="p-2 text-zinc-400 hover:text-zinc-200 rounded-full transition disabled:opacity-50 cursor-pointer"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
          accept="image/*,video/*,application/pdf,.doc,.docx"
        />

        {!isRecording ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={onInputChange}
              disabled={sending || disabled}
              placeholder={placeholder}
              className="flex-1 bg-[#2a3942] border-none rounded-2xl px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#00a884] disabled:opacity-50"
            />
            
            {!inputText.trim() && !editingMessage && (
              <button
                type="button"
                onClick={startRecording}
                disabled={sending || disabled}
                className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition disabled:opacity-50 cursor-pointer"
                title="Record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            {(inputText.trim() || pendingAttachments.length > 0 || editingMessage) && (
              <button
                type="submit"
                disabled={sending || disabled}
                className="p-2.5 bg-[#00a884] hover:bg-[#008f70] text-white rounded-full transition-all duration-200 flex items-center justify-center shadow-md cursor-pointer disabled:opacity-50"
                title={editingMessage ? 'Save Edit' : 'Send Message'}
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-between bg-[#111b21] border border-red-500/30 rounded-2xl px-4 py-2">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium font-mono">{formatDuration(recordingDuration)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 text-zinc-400 hover:text-red-400 rounded-full transition"
                title="Cancel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="p-1.5 bg-red-500 text-white hover:bg-red-600 rounded-full transition"
                title="Stop & Send"
              >
                <Square className="w-4 h-4" fill="currentColor" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}