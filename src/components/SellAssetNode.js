'use client';

import { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

function formatPrice(price) {
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function formatValue(value) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SellAssetNode({ data, id }) {
  const { holdings = [], onSellChange, onInputChange, onRemove, savedInputs } = data;
  const onSellChangeRef = useRef(onSellChange);
  const onInputChangeRef = useRef(onInputChange);
  onSellChangeRef.current = onSellChange;
  onInputChangeRef.current = onInputChange;

  const [fromAsset, setFromAsset] = useState(savedInputs?.fromAsset || '');
  const [inputMode, setInputMode] = useState(savedInputs?.inputMode || 'units'); // 'units' or 'usd'
  const [inputValue, setInputValue] = useState(savedInputs?.inputValue || '');
  const [isInitialized, setIsInitialized] = useState(false);

  const selectedHolding = holdings.find(h => h.ticker === fromAsset);
  const assetPrice = selectedHolding?.price || 0;

  // Calculate derived values based on input mode
  const sellAmount = inputMode === 'units'
    ? (inputValue ? parseFloat(inputValue) : 0)
    : (inputValue && assetPrice ? parseFloat(inputValue) / assetPrice : 0);

  const sellValue = inputMode === 'usd'
    ? (inputValue ? parseFloat(inputValue) : 0)
    : (inputValue && assetPrice ? parseFloat(inputValue) * assetPrice : 0);

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Save inputs when they change
  useEffect(() => {
    if (!isInitialized) return;
    const callback = onInputChangeRef.current;
    if (callback) {
      callback(id, {
        fromAsset,
        inputMode,
        inputValue,
      });
    }
  }, [isInitialized, id, fromAsset, inputMode, inputValue]);

  // Notify parent of sell changes
  useEffect(() => {
    const callback = onSellChangeRef.current;
    if (!callback) return;

    if (fromAsset && inputValue && parseFloat(inputValue) > 0 && selectedHolding?.price && sellAmount > 0 && sellValue > 0) {
      callback(id, {
        fromAsset,
        sellAmount,
        sellValue,
      });
    } else {
      callback(id, null);
    }
  }, [fromAsset, inputValue, sellAmount, sellValue, selectedHolding?.price, id]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[280px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-red-500 !w-3 !h-3"
      />

      <div className="bg-red-500 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Sell for Cash</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-red-600 rounded px-1.5 py-0.5 text-sm"
          title="Remove sell"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Sell Asset</label>
          <select
            value={fromAsset}
            onChange={(e) => {
              setFromAsset(e.target.value);
              setInputValue('');
            }}
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="">Select asset...</option>
            {holdings.map((h) => (
              <option key={h.ticker} value={h.ticker}>
                {h.ticker} ({h.amount} @ ${h.price ? formatPrice(h.price) : 'N/A'})
              </option>
            ))}
          </select>
        </div>

        {fromAsset && selectedHolding && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-500">
                  Amount {inputMode === 'units' ? `(max: ${selectedHolding.amount})` : `(max: $${formatValue(selectedHolding.amount * assetPrice)})`}
                </label>
                <div className="flex text-xs">
                  <button
                    onClick={() => {
                      if (inputMode !== 'units') {
                        // Convert USD to units when switching
                        if (inputValue && assetPrice) {
                          setInputValue(String(parseFloat(inputValue) / assetPrice));
                        }
                        setInputMode('units');
                      }
                    }}
                    className={`px-2 py-0.5 rounded-l border ${
                      inputMode === 'units'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    Units
                  </button>
                  <button
                    onClick={() => {
                      if (inputMode !== 'usd') {
                        // Convert units to USD when switching
                        if (inputValue && assetPrice) {
                          setInputValue(String(parseFloat(inputValue) * assetPrice));
                        }
                        setInputMode('usd');
                      }
                    }}
                    className={`px-2 py-0.5 rounded-r border-t border-r border-b ${
                      inputMode === 'usd'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>
              <div className="relative">
                {inputMode === 'usd' && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                )}
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  max={inputMode === 'units' ? selectedHolding.amount : selectedHolding.amount * assetPrice}
                  step="any"
                  className={`w-full ${inputMode === 'usd' ? 'pl-6' : 'pl-2'} pr-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-red-500`}
                  placeholder={inputMode === 'usd' ? '0.00' : '0'}
                />
              </div>
            </div>

            {inputValue && parseFloat(inputValue) > 0 && sellValue > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 space-y-1">
                <div className="text-sm text-green-700 dark:text-green-400">
                  {inputMode === 'units' ? (
                    <>Cash received: <span className="font-semibold">${formatValue(sellValue)}</span></>
                  ) : (
                    <>Sell: <span className="font-semibold">{sellAmount.toFixed(6)} {fromAsset}</span></>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-red-500 !w-3 !h-3"
      />
    </div>
  );
}
