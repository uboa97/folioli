'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useExpressions } from '@/lib/VariablesContext';

const NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function VariablePill({ name, value, allNames, isUsed, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [localName, setLocalName] = useState(name);
  const [localValue, setLocalValue] = useState(String(value));
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const valueInputRef = useRef(null);
  const commitRef = useRef(null);

  useEffect(() => {
    if (editing && valueInputRef.current) {
      const el = valueInputRef.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setLocalName(name);
      setLocalValue(String(value));
      setError(null);
    }
  }, [name, value, editing]);

  const commit = () => {
    const trimmedName = localName.trim();
    const numValue = parseFloat(localValue);
    if (!trimmedName || !NAME_PATTERN.test(trimmedName)) {
      setError('Invalid name');
      return false;
    }
    if (trimmedName !== name && allNames.includes(trimmedName)) {
      setError('Name already used');
      return false;
    }
    if (!Number.isFinite(numValue)) {
      setError('Invalid value');
      return false;
    }
    setError(null);
    if (trimmedName !== name || numValue !== value) {
      onUpdate(name, trimmedName, numValue);
    }
    setEditing(false);
    return true;
  };
  commitRef.current = commit;

  useEffect(() => {
    if (!editing) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        const ok = commitRef.current?.();
        if (!ok) {
          setLocalName(name);
          setLocalValue(String(value));
          setError(null);
          setEditing(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [editing, name, value]);

  if (editing) {
    return (
      <div
        ref={containerRef}
        className="relative flex items-center gap-1 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-1 rounded shadow"
      >
        <input
          type="text"
          value={localName}
          onChange={(e) => { setLocalName(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setLocalName(name); setLocalValue(String(value)); setError(null); setEditing(false);
            }
          }}
          className="w-20 px-1.5 py-0.5 text-xs font-mono border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="name"
        />
        <span className="text-zinc-400 text-xs">=</span>
        <input
          ref={valueInputRef}
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={(e) => { setLocalValue(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setLocalName(name); setLocalValue(String(value)); setError(null); setEditing(false);
            }
          }}
          className="w-20 px-1.5 py-0.5 text-xs text-right border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="0"
        />
        <button
          onClick={() => onRemove(name)}
          className="text-zinc-500 hover:text-red-500 text-sm w-5 h-5 flex items-center justify-center"
          title="Delete variable"
        >
          ×
        </button>
        {error && (
          <div className="absolute top-full mt-1 left-0 text-xs text-red-500 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded shadow whitespace-nowrap z-30">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center bg-zinc-200 dark:bg-zinc-700 rounded shadow-lg overflow-hidden transition-opacity ${isUsed ? '' : 'opacity-40 hover:opacity-100'}`}>
      <button
        onClick={() => setEditing(true)}
        className="px-2 py-1.5 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-sm flex items-center gap-1.5 transition-colors"
        title={isUsed ? 'Click to edit' : 'Unused — click to edit'}
      >
        <span className="font-mono italic text-blue-600 dark:text-blue-400">{name}</span>
        <span className="text-zinc-400">=</span>
        <span className="font-mono text-zinc-700 dark:text-white">{value}</span>
      </button>
      <button
        onClick={() => onRemove(name)}
        className="px-1.5 py-1.5 text-zinc-500 hover:text-white hover:bg-red-500 text-sm transition-colors"
        title="Delete variable"
      >
        ×
      </button>
    </div>
  );
}

function AddVariableButton({ allNames, onAdd }) {
  const [editing, setEditing] = useState(false);
  const [localName, setLocalName] = useState('');
  const [localValue, setLocalValue] = useState('');
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!editing) return;
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        cancel();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [editing]);

  const cancel = () => {
    setEditing(false);
    setLocalName('');
    setLocalValue('');
    setError(null);
  };

  const commit = () => {
    const trimmed = localName.trim();
    if (!trimmed || !NAME_PATTERN.test(trimmed)) {
      setError('Invalid name');
      return;
    }
    if (allNames.includes(trimmed)) {
      setError('Name already exists');
      return;
    }
    const num = parseFloat(localValue);
    if (!Number.isFinite(num)) {
      setError('Invalid value');
      return;
    }
    onAdd(trimmed, num);
    cancel();
  };

  if (editing) {
    return (
      <div
        ref={containerRef}
        className="relative flex items-center gap-1 bg-zinc-200 dark:bg-zinc-700 px-1.5 py-1 rounded shadow"
      >
        <input
          type="text"
          value={localName}
          autoFocus
          onChange={(e) => { setLocalName(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          className="w-20 px-1.5 py-0.5 text-xs font-mono border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="name"
        />
        <span className="text-zinc-400 text-xs">=</span>
        <input
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={(e) => { setLocalValue(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          className="w-20 px-1.5 py-0.5 text-xs text-right border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="0"
        />
        <button
          onClick={commit}
          className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
          title="Add"
        >
          +
        </button>
        {error && (
          <div className="absolute top-full mt-1 left-0 text-xs text-red-500 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded shadow whitespace-nowrap z-30">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-white text-sm rounded shadow-lg transition-colors"
      title="Add variable"
    >
      Add var
    </button>
  );
}

export default function VariablesPanel({ variables, onSetVariables, disabledNodes = {}, nodeIds = [] }) {
  const entries = Object.entries(variables);
  const allNames = entries.map(([n]) => n);
  const { expressions } = useExpressions();

  const usedNames = useMemo(() => {
    const used = new Set();
    if (allNames.length === 0) return used;
    // Filter out expressions owned by disabled nodes (longest-prefix match wins)
    const sortedIds = [...nodeIds].sort((a, b) => b.length - a.length);
    const activeExprStrings = [];
    for (const [key, raw] of Object.entries(expressions)) {
      const owner = sortedIds.find(id => key === id || key.startsWith(`${id}-`));
      if (owner && disabledNodes[owner]) continue;
      activeExprStrings.push(raw);
    }
    if (activeExprStrings.length === 0) return used;
    const joined = activeExprStrings.join('\n');
    for (const n of allNames) {
      const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`).test(joined)) used.add(n);
    }
    return used;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expressions, allNames.join(','), disabledNodes, nodeIds.join('|')]);

  const handleUpdate = (oldName, newName, newValue) => {
    onSetVariables(prev => {
      const updated = { ...prev };
      if (oldName !== newName) delete updated[oldName];
      updated[newName] = newValue;
      return updated;
    });
  };

  const handleRemove = (name) => {
    onSetVariables(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  };

  const handleAdd = (name, value) => {
    onSetVariables(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {entries.map(([name, value]) => (
        <VariablePill
          key={name}
          name={name}
          value={value}
          allNames={allNames}
          isUsed={usedNames.has(name)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      ))}
      <AddVariableButton allNames={allNames} onAdd={handleAdd} />
    </div>
  );
}
