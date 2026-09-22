import { MessageSquareDashed } from 'lucide-react';

export function HomePage() {
  return (
    <div
      className="flex-1 flex items-center justify-center whatsapp-wallpaper"
      style={{ minHeight: '100%' }}
    >
      <div className="text-center space-y-4 px-6 py-10">
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: '#2a3942' }}
        >
          <MessageSquareDashed className="w-8 h-8" style={{ color: '#8696a0' }} />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-light tracking-tight" style={{ color: '#e9edef' }}>
          Virexo Web
        </h2>

        {/* Description */}
        <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: '#8696a0' }}>
          Send and receive messages from the sidebar.
          Select a conversation or start a new one to begin chatting.
        </p>

        {/* Decorative line */}
        <div className="flex items-center justify-center pt-2">
          <div className="w-16 h-px" style={{ backgroundColor: '#2a3942' }} />
          <div className="w-2 h-2 rounded-full mx-3" style={{ backgroundColor: '#00a884' }} />
          <div className="w-16 h-px" style={{ backgroundColor: '#2a3942' }} />
        </div>

        <p className="text-xs" style={{ color: '#667781' }}>
          End-to-end real-time messaging
        </p>
      </div>
    </div>
  );
}
