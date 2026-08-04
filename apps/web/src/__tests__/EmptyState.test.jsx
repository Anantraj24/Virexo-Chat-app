import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '../components/ui/EmptyState';

describe('EmptyState Component', () => {
  it('renders title and description', () => {
    render(
      <EmptyState
        title="No messages"
        description="Start a conversation to see messages here."
      />
    );
    expect(screen.getByText('No messages')).toBeInTheDocument();
    expect(screen.getByText('Start a conversation to see messages here.')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <EmptyState
        icon={<span data-testid="test-icon">📭</span>}
        title="Empty"
      />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(
      <EmptyState
        title="No results"
        action={<button>Create New</button>}
      />
    );
    expect(screen.getByText('Create New')).toBeInTheDocument();
  });

  it('renders without optional props without crashing', () => {
    const { container } = render(<EmptyState />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
