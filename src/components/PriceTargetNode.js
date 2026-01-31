'use client';

import { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

function formatPrice(price) {
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function formatPercent(current, target) {
  if (!current || !target) return null;
  const change = ((target - current) / current) * 100;
  return change;
}

export default function PriceTargetNode({ data, id }) {
  const { holdings = [], onPriceTargetChange, onInputChange, onRemove, savedInputs } = data;
  const onPriceTargetChangeRef = useRef(onPriceTargetChange);
  const onInputChangeRef = useRef(onInputChange);
  onPriceTargetChangeRef.current = onPriceTargetChange;
  onInputChangeRef.current = onInputChange;

  const [asset, setAsset] = useState(savedInputs?.asset || '');
  const [targetPrice, setTargetPrice] = useState(savedInputs?.targetPrice || '');
  const [isInitialized, setIsInitialized] = useState(false);

  const selectedHolding = holdings.find(h => h.ticker === asset);
  const currentPrice = selectedHolding?.price;
  const percentChange = formatPercent(currentPrice, parseFloat(targetPrice));

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
        asset,
        targetPrice,
      });
    }
  }, [isInitialized, id, asset, targetPrice]);

  // Notify parent of price target changes
  useEffect(() => {
    const callback = onPriceTargetChangeRef.current;
    if (!callback) return;

    if (asset && targetPrice && parseFloat(targetPrice) > 0) {
      callback(id, {
        asset,
        targetPrice: parseFloat(targetPrice),
        currentPrice,
      });
    } else {
      callback(id, null);
    }
  }, [asset, targetPrice, currentPrice, id]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[280px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-cyan-500 !w-3 !h-3"
      />

      <div className="bg-cyan-500 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Price Target</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-cyan-600 rounded px-1.5 py-0.5 text-sm"
          title="Remove price target"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Asset</label>
          <select
            value={asset}
            onChange={(e) => {
              setAsset(e.target.value);
              setTargetPrice('');
            }}
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Select asset...</option>
            {holdings.filter(h => h.ticker !== 'USD').map((h) => (
              <option key={h.ticker} value={h.ticker}>
                {h.ticker} (current: ${h.price ? formatPrice(h.price) : 'N/A'})
              </option>
            ))}
          </select>
        </div>

        {asset && selectedHolding && (
          <>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Target Price</label>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input
                  type="number"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  step="any"
                  className="w-full pl-6 pr-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder={currentPrice ? formatPrice(currentPrice) : '0.00'}
                />
              </div>
              {currentPrice && (
                <div className="text-xs text-zinc-500 mt-1">
                  Current: ${formatPrice(currentPrice)}
                </div>
              )}
            </div>

            {percentChange !== null && targetPrice && (
              <div className={`rounded p-2 ${percentChange >= 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                <div className={`text-sm ${percentChange >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}% from current
                </div>
                {selectedHolding.amount && (
                  <div className={`text-xs mt-1 ${percentChange >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                    Position value: ${formatPrice(selectedHolding.amount * parseFloat(targetPrice))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-cyan-500 !w-3 !h-3"
      />
    </div>
  );
}
