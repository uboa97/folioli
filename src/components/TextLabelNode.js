'use client';

import { useState, useRef, useEffect } from 'react';

const SIZE_SCALE = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
const SIZE_CLASS = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl',
};

export default function TextLabelNode({ data, id }) {
  const { text = '', size = 'sm', onChange, onSizeChange, onRemove } = data;
  const [isEditing, setIsEditing] = useState(text === '');
  const [localText, setLocalText] = useState(text);
  const textareaRef = useRef(null);

  useEffect(() => {
    setLocalText(text);
  }, [text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const commit = () => {
    setIsEditing(false);
    if (localText !== text) onChange?.(id, localText);
  };

  const adjustSize = (delta) => {
    const idx = SIZE_SCALE.indexOf(size);
    const safeIdx = idx === -1 ? SIZE_SCALE.indexOf('sm') : idx;
    const next = SIZE_SCALE[Math.max(0, Math.min(SIZE_SCALE.length - 1, safeIdx + delta))];
    if (next !== size) onSizeChange?.(id, next);
  };

  const sizeClass = SIZE_CLASS[size] || SIZE_CLASS.sm;

  return (
    <div className="group relative">
      <div className="nodrag absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 z-10 transition-opacity">
        <button
          onClick={() => adjustSize(-1)}
          className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center hover:bg-zinc-900"
          title="Smaller"
        >
          A−
        </button>
        <button
          onClick={() => adjustSize(1)}
          className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center hover:bg-zinc-900"
          title="Larger"
        >
          A+
        </button>
        <button
          onClick={() => onRemove?.(id)}
          className="bg-zinc-700 dark:bg-zinc-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center hover:bg-red-600"
          title="Remove label"
        >
          ×
        </button>
      </div>
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setLocalText(text);
              setIsEditing(false);
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              commit();
            }
          }}
          placeholder="Type a note..."
          className={`nodrag block min-w-[180px] min-h-[60px] px-3 py-2 ${sizeClass} text-zinc-800 dark:text-zinc-100 bg-white/95 dark:bg-zinc-800/95 border border-zinc-300 dark:border-zinc-600 rounded resize focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm`}
          rows={3}
        />
      ) : (
        <div
          onDoubleClick={() => setIsEditing(true)}
          className={`px-3 py-2 ${sizeClass} text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap cursor-text min-w-[60px] min-h-[24px]`}
        >
          {text || (
            <span className="text-zinc-400 dark:text-zinc-500 italic">Double-click to edit</span>
          )}
        </div>
      )}
    </div>
  );
}
