'use client';
import { useState, useRef, useEffect } from 'react';
import { useVariables } from '@/lib/VariablesContext';

function evaluateExpression(expr, variables = {}) {
  let sanitized = expr.replace(/\s/g, '');
  let hasUnknown = false;
  sanitized = sanitized.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (name) => {
    const val = variables[name];
    if (typeof val === 'number' && isFinite(val)) {
      return val < 0 ? `(${val})` : String(val);
    }
    hasUnknown = true;
    return name;
  });
  if (hasUnknown) return null;
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

function needsEvaluation(value) {
  if (!value || typeof value !== 'string') return false;
  // Any letter (variable reference) means defer evaluation
  if (/[a-zA-Z_]/.test(value)) return true;
  // Otherwise check for math operators (excluding leading negative)
  const trimmed = value.replace(/^\s*-/, '');
  return /[+\-*/]/.test(trimmed);
}

export default function MathInput({ value, onChange, className = '', ...props }) {
  const variables = useVariables();
  const [localValue, setLocalValue] = useState(value ?? '');
  const inputRef = useRef(null);
  const showEquals = needsEvaluation(localValue);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value ?? '');
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    // If no operator/variable, pass through immediately
    if (!needsEvaluation(val)) {
      onChange(val);
    }
  };

  const evaluate = () => {
    if (!needsEvaluation(localValue)) return;
    const result = evaluateExpression(localValue, variables);
    if (result !== null) {
      const str = String(result);
      setLocalValue(str);
      onChange(str);
    }
  };

  const handleBlur = (e) => {
    if (needsEvaluation(localValue)) {
      const result = evaluateExpression(localValue, variables);
      if (result !== null) {
        const str = String(result);
        setLocalValue(str);
        onChange(str);
      } else {
        // Revert to last committed value to avoid stale display
        setLocalValue(value ?? '');
      }
    }
    if (props.onBlur) props.onBlur(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && needsEvaluation(localValue)) {
      e.preventDefault();
      e.stopPropagation();
      evaluate();
      return;
    }
    // Forward other keydown events via props
    if (props.onKeyDown) props.onKeyDown(e);
  };

  // Remove handlers we manage from rest props
  const { onKeyDown: _, onBlur: __, ...restProps } = props;

  return (
    <div className={`flex ${showEquals ? 'relative' : ''}`}>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
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
