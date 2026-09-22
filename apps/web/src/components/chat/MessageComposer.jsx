import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Send, 
  XCircle, 
  RotateCcw, 
  Edit2, 
  Plus, 
  FileText, 
  Image as ImageIcon, 
  Film, 
  Mic, 
  Square, 
  Trash2, 
  Video,
  Smile
} from 'lucide-react';

export function MessageComposer({
  inputText,
  onInputChange,
  onSend,
  sending,
  failedMessages,
  onRetryFailed,
  disabled,
  placeholder = 'Write your message...',
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
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
  }, [editingMessage, onInputChange]);

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

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() && pendingAttachments.length === 0) return;
    onSend(e);
  };

  return (
    <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800/80">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-500 rounded-lg mb-2">
          <div className="text-xs">
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              Replying to {replyingTo.sender?.displayName || replyingTo.sender?.username || 'User'}
            </span>
            <p className="text-slate-600 dark:text-zinc-400 truncate max-w-md">{replyingTo.content}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 transition cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-amber-50/70 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-lg mb-2">
          <div className="flex items-center space-x-2 text-xs text-amber-700 dark:text-amber-300">
            <Edit2 className="w-3.5 h-3.5" />
            <span>Editing message</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onCancelEdit();
              onInputChange({ target: { value: '' } });
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1 transition cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Failed Messages Retry */}
      {failedMessages.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2 py-1 mb-2">
          {failedMessages.map((msg) => (
            <div
              key={msg.idempotencyKey}
              className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-lg px-3 py-1.5 text-xs"
            >
              <span className="text-rose-600 dark:text-rose-300 truncate max-w-[200px]">
                {msg.content}
              </span>
              <button
                onClick={() => handleRetry(msg.idempotencyKey)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 p-0.5 transition cursor-pointer"
                title="Retry message"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending Attachments */}
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2 py-2 border-b border-slate-100 dark:border-zinc-800/60 mb-2">
          {pendingAttachments.map((att) => (
            <div key={att.clientId} className="relative group w-14 h-14 bg-slate-50 dark:bg-zinc-800 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 flex items-center justify-center">
              {att.file.type.startsWith('image/') ? (
                <ImageIcon className="w-5 h-5 text-slate-400" />
              ) : att.file.type.startsWith('video/') ? (
                <Film className="w-5 h-5 text-slate-400" />
              ) : (
                <FileText className="w-5 h-5 text-slate-400" />
              )}
              
              {att.uploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                  <div className="text-[10px] text-white font-medium">{att.progress}%</div>
                  <div className="w-3/4 h-1 bg-zinc-700 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${att.progress}%` }} />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => removePendingAttachment(att.clientId)}
                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer Input Bar matching screenshot */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-3 py-1.5 focus-within:border-blue-500/80 transition-all">
        {/* Plus Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || disabled || editingMessage}
          className="w-8 h-8 rounded-full border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition disabled:opacity-50 cursor-pointer shrink-0"
          title="Add attachment"
        >
          <Plus className="w-4 h-4" />
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
              className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none px-2 py-2"
            />

            {/* Right icons inside composer bar matching screenshot */}
            <div className="flex items-center space-x-1 text-slate-400 dark:text-zinc-400 shrink-0">
              <button
                type="button"
                className="p-1.5 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition cursor-pointer"
                title="Formatting"
              >
                <span className="text-xs font-semibold px-0.5">Aa</span>
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition cursor-pointer"
                title="Video"
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={startRecording}
                disabled={sending || disabled}
                className="p-1.5 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition disabled:opacity-50 cursor-pointer"
                title="Voice Note"
              >
                <Mic className="w-4 h-4" />
              </button>

              <button
                type="button"
                className="p-1.5 hover:text-slate-700 dark:hover:text-zinc-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-zinc-700/50 transition cursor-pointer"
                title="Templates"
              >
                <FileText className="w-4 h-4" />
              </button>

              {/* Blue Send Action Button */}
              <button
                type="submit"
                disabled={sending || disabled || (!inputText.trim() && pendingAttachments.length === 0 && !editingMessage)}
                className="ml-1 p-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl transition flex items-center justify-center shadow-xs disabled:opacity-40 cursor-pointer"
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-between px-2 py-1">
            <div className="flex items-center space-x-2 text-rose-500">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-medium font-mono">{formatDuration(recordingDuration)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="p-1.5 text-slate-400 hover:text-rose-500 rounded-full transition"
                title="Cancel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="p-1.5 bg-rose-500 text-white hover:bg-rose-600 rounded-full transition"
                title="Stop & Send"
              >
                <Square className="w-3.5 h-3.5" fill="currentColor" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}