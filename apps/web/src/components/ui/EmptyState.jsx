import { cn } from '../../lib/utils';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 my-4',
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-4 shadow-sm">
          {icon}
        </div>
      )}
      {title && <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>}
      {description && (
        <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
