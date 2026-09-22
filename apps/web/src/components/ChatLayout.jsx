import { useChat } from '../hooks/useChat';
import { ChatHeader } from './chat/ChatHeader';
import { MessageList } from './chat/MessageList';
import { MessageComposer } from './chat/MessageComposer';
import { TypingIndicator } from './chat/TypingIndicator';
import { ForwardMessageModal } from './chat/ForwardMessageModal';
import { ContactDetailsSidebar } from './chat/ContactDetailsSidebar';
import { ReportModal } from './modals/ReportModal';
import { useParams, useSearchParams } from 'react-router-dom';
import { useState } from 'react';

export function ChatLayout() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const jumpTo = searchParams.get('jumpTo');
  const [reportTarget, setReportTarget] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(true);
  
  const chat = useChat(id, jumpTo);

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white dark:bg-zinc-900">
      {/* Center Chat Timeline Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-r border-slate-100 dark:border-zinc-800/80">
        <ChatHeader
          conversation={chat.conversation}
          recipient={chat.getRecipient()}
          formatLastSeen={chat.formatLastSeen}
          onReportUser={() => setReportTarget({ type: 'user', id: chat.getRecipient()?.id, name: chat.getRecipient()?.username })}
          onReportConversation={() => setReportTarget({ type: 'conversation', id: chat.conversation?.id, name: chat.conversation?.name })}
          onToggleDetails={() => setDetailsOpen((prev) => !prev)}
          detailsOpen={detailsOpen}
        />

        <MessageList
          messages={chat.messages}
          loading={chat.loading}
          loadingMore={chat.loadingMore}
          loadError={chat.loadError}
          pagination={chat.pagination}
          onLoadEarlier={chat.handleLoadEarlier}
          formatDateSeparator={chat.formatDateSeparator}
          formatTime={chat.formatTime}
          currentUser={chat.currentUser}
          containerRef={chat.containerRef}
          onScroll={chat.handleScroll}
          messagesEndRef={chat.messagesEndRef}
          onEdit={chat.handleEditMessage}
          onDelete={chat.handleDeleteMessage}
          onDeleteForEveryone={chat.handleDeleteForEveryone}
          onReply={(msg) => chat.setReplyingTo(msg)}
          onPin={chat.handlePinMessage}
          onUnpin={chat.handleUnpinMessage}
          onReaction={chat.handleAddReaction}
          onForward={(msg) => chat.setForwardingMessage(msg)}
          onReport={(msg) => setReportTarget({ type: 'message', id: msg.id, name: 'this message' })}
        />

        <TypingIndicator typingUsers={chat.typingUsers} />

        <MessageComposer
          inputText={chat.inputText}
          onInputChange={chat.handleInputChange}
          onSend={chat.handleSendMessage}
          sending={chat.sending}
          failedMessages={chat.failedMessages}
          onRetryFailed={chat.handleRetryFailed}
          replyingTo={chat.replyingTo}
          onCancelReply={() => chat.setReplyingTo(null)}
          editingMessage={chat.editingMessage}
          onCancelEdit={chat.handleCancelEdit}
          onSubmitEdit={chat.submitEditMessage}
          pendingAttachments={chat.pendingAttachments}
          uploadAttachment={chat.uploadAttachment}
          removePendingAttachment={chat.removePendingAttachment}
        />
      </div>

      {/* Right Column: Contact Details Sidebar matching screenshot */}
      <ContactDetailsSidebar
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        recipient={chat.getRecipient()}
        conversation={chat.conversation}
        messages={chat.messages}
      />

      <ForwardMessageModal
        isOpen={!!chat.forwardingMessage}
        onClose={() => chat.setForwardingMessage(null)}
        message={chat.forwardingMessage}
      />

      <ReportModal
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        targetType={reportTarget?.type}
        targetId={reportTarget?.id}
        targetName={reportTarget?.name}
      />
    </div>
  );
}