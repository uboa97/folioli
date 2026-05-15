'use client';
import { useState, useRef, useEffect } from 'react';
import { useVariables, useExpressions } from '@/lib/VariablesContext';

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

function hasVariableReference(value) {
  return typeof value === 'string' && /[a-zA-Z_]/.test(value);
}

export default function MathInput({ value, onChange, expressionId, className = '', ...props }) {
  const variables = useVariables();
  const { expressions, setExpression, clearExpression } = useExpressions();
  const storedRaw = expressionId ? expressions[expressionId] : undefined;

  const [localValue, setLocalValue] = useState(() => storedRaw ?? (value ?? ''));
  const inputRef = useRef(null);
  const lastEmittedRef = useRef(value ?? '');
  const showEquals = needsEvaluation(localValue);

  // Sync external value changes — but ignore echoes of our own emissions.
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    // External value change — if we had a stored raw expression, the parent has
    // overridden it, so drop the binding.
    if (expressionId && expressions[expressionId] !== undefined) {
      clearExpression(expressionId);
    }
    setLocalValue(value ?? '');
    lastEmittedRef.current = value ?? '';
  }, [value, expressionId, expressions, clearExpression]);

  // Reactive re-evaluation: when variables change (or the stored raw changes),
  // re-evaluate and push the new numeric value upstream.
  useEffect(() => {
    if (!expressionId) return;
    const raw = expressions[expressionId];
    if (!raw) return;
    const result = evaluateExpression(raw, variables);
    if (result === null) return;
    const str = String(result);
    if (str === lastEmittedRef.current) return;
    lastEmittedRef.current = str;
    setLocalValue(raw);
    onChange(str);
    // onChange intentionally excluded from deps — it's typically inline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variables, expressionId, expressions]);

  const handleChange = (e) => {
    const val = e.target.value;
    setLocalValue(val);
    // If user typed a plain number, pass through and drop any prior expression binding.
    if (!needsEvaluation(val)) {
      if (expressionId && expressions[expressionId] !== undefined) {
        clearExpression(expressionId);
      }
      lastEmittedRef.current = val;
      onChange(val);
    }
  };

  const commit = () => {
    if (!needsEvaluation(localValue)) return;
    const result = evaluateExpression(localValue, variables);
    if (result === null) {
      // Revert to last committed value to avoid stale display
      setLocalValue(value ?? '');
      return;
    }
    const str = String(result);
    if (expressionId) {
      if (hasVariableReference(localValue)) {
        setExpression(expressionId, localValue);
        // Keep showing the raw expression for clarity that it's reactive.
        setLocalValue(localValue);
      } else {
        clearExpression(expressionId);
        setLocalValue(str);
      }
    } else {
      setLocalValue(str);
    }
    lastEmittedRef.current = str;
    onChange(str);
  };

  const handleBlur = (e) => {
    commit();
    if (props.onBlur) props.onBlur(e);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && needsEvaluation(localValue)) {
      e.preventDefault();
      e.stopPropagation();
      commit();
      return;
    }
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
          onClick={commit}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-xs font-bold rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
          title="Evaluate expression (Enter)"
        >
          =
        </button>
      )}
    </div>
  );
}
