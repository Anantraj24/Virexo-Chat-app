import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

export function Dropdown({ trigger, items, align = 'right', className }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div onClick={() => setIsOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-48 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1 focus:outline-none backdrop-blur-md',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="h-px bg-zinc-800 my-1" />;
            }
            return (
              <button
                key={index}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={cn(
                  'w-full text-left px-3.5 py-2 text-xs font-medium flex items-center space-x-2.5 transition cursor-pointer',
                  item.danger
                    ? 'text-red-400 hover:bg-red-950/30 hover:text-red-300'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white',
                  item.disabled && 'opacity-50 pointer-events-none'
                )}
              >
                {item.icon && <span className="text-sm shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
