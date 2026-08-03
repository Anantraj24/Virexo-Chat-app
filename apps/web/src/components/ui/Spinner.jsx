import { cn } from '../../lib/utils';

export function Spinner({ size = 'md', variant = 'primary', className }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  const variantClasses = {
    primary: 'border-indigo-500/30 border-t-indigo-500',
    white: 'border-white/30 border-t-white',
    dark: 'border-zinc-700 border-t-zinc-200',
  };

  return (
    <div
      role="status"
      aria-label="loading"
      className={cn(
        'rounded-full animate-spin',
        sizeClasses[size] || sizeClasses.md,
        variantClasses[variant] || variantClasses.primary,
        className
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
