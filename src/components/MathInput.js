'use client';
import { useState, useRef, useEffect } from 'react';

function evaluateExpression(expr) {
  // Only allow digits, decimal points, +, -, *, /, parentheses, and whitespace
  const sanitized = expr.replace(/\s/g, '');
  if (!/^[\d.+\-*/()]+$/.test(sanitized)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${sanitized})`)();
    if (typeof result !== 'number' || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

function hasOperator(value) {
  if (!value || typeof value !== 'string') return false;
  // Check if string contains +, -, *, / that isn't just a leading negative
  const trimmed = value.replace(/^\s*-/, '');
  return /[+\-*/]/.test(trimmed);
}

export default function MathInput({ value, onChange, className = '', ...props }) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const inputRef = useRef(null);
  const showEquals = hasOperator(localValue);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    // If no operator, pass through immediately
    if (!hasOperator(val)) {
      onChange(val);
    }
  };

  const evaluate = () => {
    if (!hasOperator(localValue)) return;
    const result = evaluateExpression(localValue);
    if (result !== null) {
      const str = String(result);
      setLocalValue(str);
      onChange(str);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && hasOperator(localValue)) {
      e.preventDefault();
      e.stopPropagation();
      evaluate();
      return;
    }
    // Forward other keydown events via props
    if (props.onKeyDown) props.onKeyDown(e);
  };

  // Remove onKeyDown from rest props since we handle it
  const { onKeyDown: _, ...restProps } = props;

  return (
    <div className="relative flex">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`${className} ${showEquals ? 'pr-8' : ''}`}
        {...restProps}
      />
      {showEquals && (
        <button
          type="button"
          onClick={evaluate}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-xs font-bold rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          title="Evaluate expression (Enter)"
        >
          =
        </button>
      )}
    </div>
  );
}
