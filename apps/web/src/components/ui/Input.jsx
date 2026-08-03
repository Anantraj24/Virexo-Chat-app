import { useId } from 'react';
import { cn } from '../../lib/utils';

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className,
  id: customId,
  ...props
}) {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <div className={cn('flex flex-col space-y-1.5', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-zinc-300 select-none">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-zinc-400 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </div>
        )}

        <input
          id={id}
          className={cn(
            'w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-500 border border-zinc-800 rounded-lg text-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50 disabled:bg-zinc-950',
            leftIcon ? 'pl-9' : 'pl-3.5',
            rightIcon ? 'pr-9' : 'pr-3.5',
            'py-2',
            error && 'border-red-500/80 focus:ring-red-500/40 focus:border-red-500',
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div className="absolute right-3 text-zinc-400 flex items-center justify-center">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500">{helperText}</p>
      ) : null}
    </div>
  );
}
