import { useChat } from '../hooks/useChat';
import { ChatHeader } from './chat/ChatHeader';
import { MessageList } from './chat/MessageList';
import { MessageComposer } from './chat/MessageComposer';
import { TypingIndicator } from './chat/TypingIndicator';
import { ForwardMessageModal } from './chat/ForwardMessageModal';
import { useParams } from 'react-router-dom';

export function ChatLayout() {
  const { id } = useParams();
  const chat = useChat(id);

  if (!id) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-zinc-400">Select a conversation</h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Choose a channel or direct message to start chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      <ChatHeader
        conversation={chat.conversation}
        recipient={chat.getRecipient()}
        formatLastSeen={chat.formatLastSeen}
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
      />

      <ForwardMessageModal
        isOpen={!!chat.forwardingMessage}
        onClose={() => chat.setForwardingMessage(null)}
        message={chat.forwardingMessage}
      />
    </div>
  );
}