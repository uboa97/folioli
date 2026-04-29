'use client';

import { useState, useRef, useEffect } from 'react';

const TYPE_OPTIONS = [
  { type: 'rotate', label: 'Rotate Asset' },
  { type: 'sell', label: 'Sell' },
  { type: 'buy', label: 'Buy' },
  { type: 'priceTarget', label: 'Price Target' },
  { type: 'allIn', label: 'All-In' },
  { type: 'yield', label: 'Yield' },
];

export default function NodeTypeSelector({ currentType, label, onReplace, hoverBgClass = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`flex items-center gap-1 rounded px-1 -mx-1 ${hoverBgClass}`}
        title="Replace node type"
      >
        <span>{label}</span>
        <span className="text-xs opacity-70">▾</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded shadow-lg z-50 min-w-[140px] py-1">
          {TYPE_OPTIONS.filter(o => o.type !== currentType).map(o => (
            <button
              key={o.type}
              onClick={() => { onReplace?.(o.type); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm font-normal text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
