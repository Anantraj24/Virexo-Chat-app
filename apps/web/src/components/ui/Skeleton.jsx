import { cn } from '../../lib/utils';
import { usePreferencesStore } from '../../store/usePreferencesStore';

export function Skeleton({ className, variant = 'rectangle', ...props }) {
  const { reducedMotion } = usePreferencesStore();

  const variants = {
    rectangle: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-4 w-full',
  };

  return (
    <div
      className={cn(
        'bg-zinc-800/60',
        !reducedMotion && 'animate-pulse',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
      <div className="flex items-center space-x-3">
        <Skeleton variant="circle" className="w-10 h-10 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton variant="text" className="w-1/3 h-4" />
          <Skeleton variant="text" className="w-1/2 h-3" />
        </div>
      </div>
      <Skeleton variant="rectangle" className="h-16 w-full" />
    </div>
  );
}
