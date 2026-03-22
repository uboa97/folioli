'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function TickerSearch({
  value,
  onChange,
  onSelect,
  onKeyDown,
  className = '',
  wrapperClassName = '',
  placeholder = 'e.g. BTC, AAPL',
  disabled = false,
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const requestIdRef = useRef(0);
  const debounceRef = useRef(null);

  // Sync external value changes only when not focused (user isn't typing)
  useEffect(() => {
    if (!isFocused) {
      setQuery(value || '');
    }
  }, [value, isFocused]);

  // Position the portal dropdown below the input
  const updateDropdownPos = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const fetchResults = useCallback(async (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/search-ticker?query=${encodeURIComponent(trimmed)}`);
      if (requestId !== requestIdRef.current) return;
      const data = await res.json();
      setResults(data);
      if (data.length > 0) {
        updateDropdownPos();
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
      setHighlightIndex(-1);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
      setIsOpen(false);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [updateDropdownPos]);

  const handleInputChange = (e) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    // onChange fires on every keystroke (for PortfolioNode's "Add" button)
    onChange?.(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(val);
    }, 300);
  };

  const commitSelection = useCallback((symbol) => {
    // Yahoo crypto comes as "ETH-USD", "BTC-USD" — strip the -USD/-EUR etc. suffix
    let ticker = symbol.replace(/-(USD|EUR|GBP|BTC|ETH|USDT)$/, '');
    setQuery(ticker);
    onChange?.(ticker);
    onSelect?.(ticker);
    setIsOpen(false);
    setResults([]);
  }, [onChange, onSelect]);

  const handleKeyDownInternal = (e) => {
    if (isOpen && results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % results.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
        return;
      }
      if (e.key === 'Enter' && highlightIndex >= 0) {
        e.preventDefault();
        commitSelection(results[highlightIndex].symbol);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Close dropdown when clicking outside both the input and the dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e) => {
      if (
        wrapperRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isOpen]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const dropdown = isOpen && results.length > 0 && dropdownPos && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
        zIndex: 9999,
      }}
      className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded shadow-lg max-h-48 overflow-y-auto"
    >
      {results.map((item, i) => (
        <div
          key={item.symbol}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            commitSelection(item.symbol);
          }}
          className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
            i === highlightIndex ? 'bg-zinc-100 dark:bg-zinc-700' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-semibold shrink-0">{item.symbol}</span>
            <span className="text-zinc-500 dark:text-zinc-400 truncate text-xs">{item.name}</span>
          </div>
          {item.exchange && (
            <span className="text-zinc-400 dark:text-zinc-500 text-xs shrink-0 ml-2">{item.exchange}</span>
          )}
        </div>
      ))}
    </div>,
    document.body
  );

  return (
    <div ref={wrapperRef} className={`relative ${wrapperClassName}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDownInternal}
        onFocus={() => {
          setIsFocused(true);
          if (results.length > 0) {
            updateDropdownPos();
            setIsOpen(true);
          }
        }}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className={className}
        placeholder={placeholder}
      />
      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-3 h-3 border border-zinc-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {dropdown}
    </div>
  );
}
