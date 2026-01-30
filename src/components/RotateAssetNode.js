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

export default function RotateAssetNode({ data, id }) {
  const { holdings = [], onRotationChange, onInputChange, onRemove, savedInputs } = data;
  const onRotationChangeRef = useRef(onRotationChange);
  const onInputChangeRef = useRef(onInputChange);
  onRotationChangeRef.current = onRotationChange;
  onInputChangeRef.current = onInputChange;

  const [fromAsset, setFromAsset] = useState(savedInputs?.fromAsset || '');
  const [sellAmount, setSellAmount] = useState(savedInputs?.sellAmount || '');
  const [toAsset, setToAsset] = useState(savedInputs?.toAsset || '');
  const [toPrice, setToPrice] = useState(savedInputs?.toPrice ?? null);
  const [toType, setToType] = useState(savedInputs?.toType ?? null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const selectedHolding = holdings.find(h => h.ticker === fromAsset);
  const sellValue = selectedHolding && sellAmount
    ? parseFloat(sellAmount) * (selectedHolding.price || 0)
    : 0;

  const buyAmount = toPrice && sellValue ? sellValue / toPrice : 0;

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Fetch price when toAsset changes (skip if we have saved price on init)
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
        fromAsset,
        sellAmount,
        toAsset,
        toPrice,
        toType,
      });
    }
  }, [isInitialized, id, fromAsset, sellAmount, toAsset, toPrice, toType]);

  // Notify parent of rotation changes
  useEffect(() => {
    const callback = onRotationChangeRef.current;
    if (!callback) return;

    if (fromAsset && sellAmount && parseFloat(sellAmount) > 0 && toAsset.trim() && toPrice) {
      callback(id, {
        fromAsset,
        sellAmount: parseFloat(sellAmount),
        sellValue,
        toAsset: toAsset.toUpperCase().trim(),
        toPrice,
        toType,
        buyAmount,
      });
    } else {
      callback(id, null);
    }
  }, [fromAsset, sellAmount, toAsset, toPrice, toType, sellValue, buyAmount, id]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[280px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-orange-500 !w-3 !h-3"
      />

      <div className="bg-orange-500 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Rotate Asset</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-orange-600 rounded px-1.5 py-0.5 text-sm"
          title="Remove rotation"
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
              setSellAmount('');
            }}
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
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
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Amount to Sell (max: {selectedHolding.amount})
            </label>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              max={selectedHolding.amount}
              step="any"
              className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="0"
            />
            {sellValue > 0 && (
              <div className="text-xs text-zinc-500 mt-1">
                Value: ${formatValue(sellValue)}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Buy Asset (ticker)</label>
          <input
            type="text"
            value={toAsset}
            onChange={(e) => setToAsset(e.target.value.toUpperCase())}
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
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

        {sellValue > 0 && toPrice && buyAmount > 0 && (
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
        className="!bg-orange-500 !w-3 !h-3"
      />
    </div>
  );
}
