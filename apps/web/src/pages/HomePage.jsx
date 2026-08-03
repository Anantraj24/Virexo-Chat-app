import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { MessageSquare, Sparkles, Send, Lock, User, Plus } from 'lucide-react';

export function HomePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { addToast } = useToast();

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome Hero Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-zinc-900 to-zinc-900 border border-indigo-500/20 relative overflow-hidden">
        <div className="flex items-center space-x-3 mb-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">Design System Showcase</h2>
        </div>
        <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
          Virexo Phase 3 Frontend Foundation. Demonstrating atomic components, theme integration, responsive layouts, and accessible design tokens.
        </p>
      </div>

      {/* Buttons Showcase Section */}
      <section className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Buttons & Variants</h3>
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary" leftIcon={<Send className="w-3.5 h-3.5" />}>
            Primary Action
          </Button>
          <Button variant="secondary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Secondary
          </Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" isLoading>
            Loading
          </Button>
        </div>
      </section>

      {/* Inputs & Form Elements */}
      <section className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Inputs & Controls</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Username"
            placeholder="e.g. alex_rivera"
            leftIcon={<User className="w-4 h-4" />}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            error={inputValue.length > 0 && inputValue.length < 6 ? 'Password must be at least 6 characters' : null}
          />
        </div>
      </section>

      {/* Avatars & Presence Indicators */}
      <section className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Avatars & Presence</h3>
        <div className="flex items-center space-x-4">
          <Avatar name="Alex Rivera" status="online" size="xl" />
          <Avatar name="Sarah Chen" status="away" size="lg" />
          <Avatar name="Jordan Vance" status="offline" size="md" />
          <Avatar name="Dev Lead" status="online" size="sm" />
          <Avatar name="Bot" size="xs" />
        </div>
      </section>

      {/* Interactive Trigger Components */}
      <section className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Feedback & Modals</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open Modal Dialog
          </Button>

          <Button
            variant="outline"
            onClick={() => addToast({ message: 'Operation completed successfully!', type: 'success' })}
          >
            Trigger Success Toast
          </Button>

          <Button
            variant="outline"
            onClick={() => addToast({ message: 'Failed to synchronize preferences.', type: 'error' })}
          >
            Trigger Error Toast
          </Button>
        </div>
      </section>

      {/* Skeleton Loading States */}
      <section className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Skeleton Loading States</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <div className="space-y-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <Skeleton variant="text" className="w-3/4 h-5" />
            <Skeleton variant="text" className="w-full h-3" />
            <Skeleton variant="text" className="w-5/6 h-3" />
          </div>
        </div>
      </section>

      {/* Empty State Component */}
      <EmptyState
        icon={<MessageSquare className="w-6 h-6" />}
        title="No Conversations Selected"
        description="Choose a channel from the sidebar or initiate a direct message to start chatting."
        action={
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            Browse Channels
          </Button>
        }
      />

      {/* Demo Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Browse Public Channels"
        description="Join existing workspace channels to connect with team members."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              Confirm Selection
            </Button>
          </>
        }
      >
        <p className="text-xs text-zinc-300 leading-relaxed">
          Modal dialog content demonstrating accessible backdrop blur, keyboard dismissal, and flexible action buttons.
        </p>
      </Modal>
    </div>
  );
}
