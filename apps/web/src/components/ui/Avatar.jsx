import { useState } from 'react';
import { cn } from '../../lib/utils';

export function Avatar({
  src,
  name = 'User',
  status,
  size = 'md',
  className,
}) {
  const [imageError, setImageError] = useState(false);

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusSizes = {
    xs: 'w-2 h-2 border',
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4 h-4 border-2',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    offline: 'bg-zinc-500',
    away: 'bg-amber-500',
  };

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={cn(
          'relative rounded-xl overflow-hidden flex items-center justify-center font-semibold select-none bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm',
          sizes[size] || sizes.md,
          className
        )}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-zinc-950 shadow-sm',
            statusSizes[size] || statusSizes.md,
            statusColors[status] || statusColors.offline
          )}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
}
