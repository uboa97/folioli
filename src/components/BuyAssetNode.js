'use client';

import { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { fetchPrice } from '@/lib/fetchPrice';

function formatPrice(price) {
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function formatValue(value) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BuyAssetNode({ data, id }) {
  const { onBuyChange, onInputChange, onRemove, savedInputs } = data;
  const onBuyChangeRef = useRef(onBuyChange);
  const onInputChangeRef = useRef(onInputChange);
  onBuyChangeRef.current = onBuyChange;
  onInputChangeRef.current = onInputChange;

  const [cashAmount, setCashAmount] = useState(savedInputs?.cashAmount || '');
  const [toAsset, setToAsset] = useState(savedInputs?.toAsset || '');
  const [toPrice, setToPrice] = useState(savedInputs?.toPrice ?? null);
  const [toType, setToType] = useState(savedInputs?.toType ?? null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const buyAmount = toPrice && cashAmount ? parseFloat(cashAmount) / toPrice : 0;

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Fetch price when toAsset changes
  useEffect(() => {
    if (!toAsset.trim()) {
      setToPrice(null);
      setToType(null);
      return;
    }

    // Skip fetch on initial load if we have saved price
    if (!isInitialized && savedInputs?.toPrice !== undefined) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingPrice(true);
      const { price, type } = await fetchPrice(toAsset.toUpperCase().trim());
      setToPrice(price);
      setToType(type);
      setIsFetchingPrice(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [toAsset, isInitialized, savedInputs?.toPrice]);

  // Save inputs when they change
  useEffect(() => {
    if (!isInitialized) return;
    const callback = onInputChangeRef.current;
    if (callback) {
      callback(id, {
        cashAmount,
        toAsset,
        toPrice,
        toType,
      });
    }
  }, [isInitialized, id, cashAmount, toAsset, toPrice, toType]);

  // Notify parent of buy changes
  useEffect(() => {
    const callback = onBuyChangeRef.current;
    if (!callback) return;

    if (cashAmount && parseFloat(cashAmount) > 0 && toAsset.trim() && toPrice) {
      callback(id, {
        cashAmount: parseFloat(cashAmount),
        toAsset: toAsset.toUpperCase().trim(),
        toPrice,
        toType,
        buyAmount,
      });
    } else {
      callback(id, null);
    }
  }, [cashAmount, toAsset, toPrice, toType, buyAmount, id]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[280px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-green-500 !w-3 !h-3"
      />

      <div className="bg-green-500 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Buy with Cash</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-green-600 rounded px-1.5 py-0.5 text-sm"
          title="Remove buy"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Cash Amount (USD)</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
            <input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              step="any"
              className="w-full pl-6 pr-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Buy Asset (ticker)</label>
          <input
            type="text"
            value={toAsset}
            onChange={(e) => setToAsset(e.target.value.toUpperCase())}
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="e.g. ETH, AAPL"
          />
          {isFetchingPrice && (
            <div className="text-xs text-zinc-500 mt-1">Fetching price...</div>
          )}
          {toPrice !== null && !isFetchingPrice && (
            <div className="text-xs text-zinc-500 mt-1">
              Price: ${formatPrice(toPrice)} ({toType})
            </div>
          )}
          {toAsset && toPrice === null && !isFetchingPrice && (
            <div className="text-xs text-red-500 mt-1">Price not found</div>
          )}
        </div>

        {cashAmount && parseFloat(cashAmount) > 0 && toPrice && buyAmount > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
            <div className="text-sm text-green-700 dark:text-green-400">
              Receive: <span className="font-semibold">{buyAmount.toFixed(6)} {toAsset.toUpperCase()}</span>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-green-500 !w-3 !h-3"
      />
    </div>
  );
}
