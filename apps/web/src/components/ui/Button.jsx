import { cn } from '../../lib/utils';
import { Spinner } from './Spinner';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  leftIcon,
  rightIcon,
  className,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variants = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white focus:ring-indigo-500 shadow-sm border border-indigo-500/30',
    secondary:
      'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-850 text-zinc-100 focus:ring-zinc-600 border border-zinc-700/80',
    outline:
      'border border-zinc-700 hover:bg-zinc-800/60 active:bg-zinc-800 text-zinc-200 focus:ring-zinc-600 bg-transparent',
    ghost:
      'hover:bg-zinc-800/50 active:bg-zinc-800 text-zinc-300 hover:text-white focus:ring-zinc-600 bg-transparent',
    danger:
      'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white focus:ring-red-500 shadow-sm border border-red-500/30',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-3.5 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      disabled={isDisabled || isLoading}
      className={cn(baseClasses, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} variant={variant === 'primary' || variant === 'danger' ? 'white' : 'dark'} />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
}
