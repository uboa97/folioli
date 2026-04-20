'use client';

import { useState, useEffect } from 'react';

const NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function VariableRow({ name, value, allNames, onUpdate, onRemove }) {
  const [localName, setLocalName] = useState(name);
  const [localValue, setLocalValue] = useState(String(value));
  const [error, setError] = useState(null);

  useEffect(() => { setLocalName(name); }, [name]);
  useEffect(() => { setLocalValue(String(value)); }, [value]);

  const commit = () => {
    const trimmedName = localName.trim();
    const numValue = parseFloat(localValue);

    if (!trimmedName || !NAME_PATTERN.test(trimmedName)) {
      setError('Invalid name');
      setLocalName(name);
      return;
    }
    if (trimmedName !== name && allNames.includes(trimmedName)) {
      setError('Name already used');
      setLocalName(name);
      return;
    }
    if (!Number.isFinite(numValue)) {
      setError('Invalid value');
      setLocalValue(String(value));
      return;
    }
    setError(null);
    if (trimmedName !== name || numValue !== value) {
      onUpdate(name, trimmedName, numValue);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={localName}
          onChange={(e) => { setLocalName(e.target.value); setError(null); }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
            if (e.key === 'Escape') { setLocalName(name); setError(null); e.target.blur(); }
          }}
          className="flex-1 min-w-0 px-2 py-1 text-sm font-mono border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="name"
        />
        <span className="text-zinc-400 text-sm">=</span>
        <input
          type="text"
          inputMode="decimal"
          value={localValue}
          onChange={(e) => { setLocalValue(e.target.value); setError(null); }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.target.blur();
            if (e.key === 'Escape') { setLocalValue(String(value)); setError(null); e.target.blur(); }
          }}
          className="w-24 px-2 py-1 text-sm text-right border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="0"
        />
        <button
          onClick={() => onRemove(name)}
          className="text-zinc-400 hover:text-red-500 text-sm w-5 h-5 flex items-center justify-center"
          title="Remove variable"
        >
          ×
        </button>
      </div>
      {error && (
        <div className="text-xs text-red-500 mt-0.5 ml-1">{error}</div>
      )}
    </div>
  );
}

export default function VariablesPanel({ variables, onSetVariables }) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [addError, setAddError] = useState(null);

  const entries = Object.entries(variables);
  const allNames = entries.map(([n]) => n);

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

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (!NAME_PATTERN.test(trimmed)) {
      setAddError('Name must start with a letter or _');
      return;
    }
    if (variables[trimmed] !== undefined) {
      setAddError('Name already exists');
      return;
    }
    const num = parseFloat(newValue);
    if (!Number.isFinite(num)) {
      setAddError('Invalid value');
      return;
    }
    onSetVariables(prev => ({ ...prev, [trimmed]: num }));
    setNewName('');
    setNewValue('');
    setAddError(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-white text-sm rounded shadow-lg transition-colors flex items-center gap-1.5"
        title="Variables"
      >
        <span className="text-xs font-mono italic">x</span>
        Variables
        {entries.length > 0 && (
          <span className="text-xs bg-zinc-300 dark:bg-zinc-600 px-1.5 rounded">
            {entries.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded shadow-lg z-20 w-[320px] p-3">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
              Reference by name in any number input (e.g. <span className="font-mono">btc * 2</span>).
            </div>
            {entries.length > 0 && (
              <div className="space-y-1.5 mb-3 max-h-[280px] overflow-y-auto">
                {entries.map(([name, value]) => (
                  <VariableRow
                    key={name}
                    name={name}
                    value={value}
                    allNames={allNames}
                    onUpdate={handleUpdate}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setAddError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  className="flex-1 min-w-0 px-2 py-1 text-sm font-mono border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="name"
                />
                <span className="text-zinc-400 text-sm">=</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newValue}
                  onChange={(e) => { setNewValue(e.target.value); setAddError(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  className="w-24 px-2 py-1 text-sm text-right border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
                <button
                  onClick={handleAdd}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                  title="Add variable"
                >
                  +
                </button>
              </div>
              {addError && (
                <div className="text-xs text-red-500 mt-1 ml-1">{addError}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
