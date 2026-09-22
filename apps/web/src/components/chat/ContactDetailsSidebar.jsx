import { useState } from 'react';
import { 
  X, 
  Phone, 
  Video, 
  MoreHorizontal, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Download,
  Check
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';

export function ContactDetailsSidebar({ 
  recipient, 
  conversation, 
  onClose, 
  messages = [],
  isOpen = true 
}) {
  const [aboutOpen, setAboutOpen] = useState(true);
  const [addressOpen, setAddressOpen] = useState(true);
  const [attachmentsOpen, setAttachmentsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const displayName = recipient?.displayName || recipient?.username || conversation?.name || 'Matthew Anderson';
  const email = recipient?.email || `${(recipient?.username || 'mat_anderson').toLowerCase()}@gmail.com`;
  const bio = recipient?.bio || 'Product Designer';
  const phone = recipient?.phone || '(213) 555-1234';

  // Extract attachments from messages if available, or supply defaults matching reference UI
  const conversationAttachments = messages
    .filter((m) => m.attachments && m.attachments.length > 0)
    .flatMap((m) => m.attachments)
    .slice(0, 5);

  const displayAttachments = conversationAttachments.length > 0 
    ? conversationAttachments 
    : [
        { filename: 'Billing issue.pdf', type: 'application/pdf', url: '#' },
        { filename: 'Purchase oreder receipt.pdf', type: 'application/pdf', url: '#' }
      ];

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 border-l border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full shrink-0 overflow-y-auto z-10 transition-all duration-200">
      {/* Header with Close button */}
      <div className="h-14 px-4 flex items-center justify-end border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User Hero Section */}
      <div className="p-6 flex flex-col items-center text-center border-b border-slate-100 dark:border-zinc-800/80">
        <div className="relative mb-3">
          <Avatar
            name={displayName}
            src={recipient?.avatarUrl}
            size="xl"
            status={recipient?.status || 'online'}
            className="w-20 h-20 text-xl border-4 border-white dark:border-zinc-900 shadow-sm"
          />
        </div>

        <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-base">
          {displayName}
        </h3>

        <div className="flex items-center space-x-1.5 text-xs text-slate-400 dark:text-zinc-400 mt-1">
          <span>{email}</span>
          <button
            onClick={handleCopyEmail}
            className="p-1 hover:text-slate-700 dark:hover:text-zinc-200 rounded transition cursor-pointer"
            title="Copy email"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Quick Action Circles */}
        <div className="flex items-center space-x-3 mt-4">
          <button 
            className="w-9 h-9 rounded-full border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button 
            className="w-9 h-9 rounded-full border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Video call"
          >
            <Video className="w-4 h-4" />
          </button>
          <button 
            className="w-9 h-9 rounded-full border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Accordions */}
      <div className="flex-1 divide-y divide-slate-100 dark:divide-zinc-800/80 overflow-y-auto">
        {/* About Section */}
        <div className="py-4 px-5">
          <button
            onClick={() => setAboutOpen(!aboutOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider mb-3 cursor-pointer"
          >
            <span>About</span>
            {aboutOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {aboutOpen && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[11px] text-slate-400 dark:text-zinc-400">Full Name</div>
                <div className="text-slate-800 dark:text-zinc-200 font-medium mt-0.5">{displayName}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 dark:text-zinc-400">Bio</div>
                <div className="text-slate-800 dark:text-zinc-200 font-medium mt-0.5">{bio}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 dark:text-zinc-400">Phone</div>
                <div className="text-slate-800 dark:text-zinc-200 font-medium mt-0.5">{phone}</div>
              </div>
            </div>
          )}
        </div>

        {/* Address Section */}
        <div className="py-4 px-5">
          <button
            onClick={() => setAddressOpen(!addressOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider mb-3 cursor-pointer"
          >
            <span>Address</span>
            {addressOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {addressOpen && (
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[11px] text-slate-400 dark:text-zinc-400">Country</div>
                <div className="text-slate-800 dark:text-zinc-200 font-medium mt-0.5">United States of America</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 dark:text-zinc-400">Postal Code</div>
                <div className="text-slate-800 dark:text-zinc-200 font-medium mt-0.5">ERT 62574</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 dark:text-zinc-400">Tax ID</div>
                <div className="text-slate-800 dark:text-zinc-200 font-medium mt-0.5">AS56417896</div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Attachments Section */}
        <div className="py-4 px-5">
          <button
            onClick={() => setAttachmentsOpen(!attachmentsOpen)}
            className="w-full flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-zinc-100 uppercase tracking-wider mb-3 cursor-pointer"
          >
            <span>Upload attachments</span>
            {attachmentsOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {attachmentsOpen && (
            <div className="space-y-2 mt-2">
              {displayAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-rose-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-zinc-200 truncate">
                      {att.filename || 'Document.pdf'}
                    </span>
                  </div>

                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded transition shrink-0"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
