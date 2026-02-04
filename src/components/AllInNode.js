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

export default function AllInNode({ data, id }) {
  const { holdings = [], priceOverrides = {}, onAllInChange, onInputChange, onRemove, onAddChainedNode, savedInputs } = data;
  const onAllInChangeRef = useRef(onAllInChange);
  const onInputChangeRef = useRef(onInputChange);
  onAllInChangeRef.current = onAllInChange;
  onInputChangeRef.current = onInputChange;

  const [toAsset, setToAsset] = useState(savedInputs?.toAsset || '');
  const [toPrice, setToPrice] = useState(savedInputs?.toPrice ?? null);
  const [toType, setToType] = useState(savedInputs?.toType ?? null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedPriceRef = useRef(savedInputs?.toPrice);

  // Calculate total portfolio value
  const totalValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);

  // Calculate how much of the target asset we'd get
  const allInAmount = toPrice && totalValue > 0 ? totalValue / toPrice : 0;

  // Mark as initialized after first render
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Sync price from savedInputs when it changes externally (e.g., global refresh)
  useEffect(() => {
    if (savedInputs?.toPrice !== undefined && savedInputs.toPrice !== lastSavedPriceRef.current) {
      lastSavedPriceRef.current = savedInputs.toPrice;
      setToPrice(savedInputs.toPrice);
      if (savedInputs.toType) {
        setToType(savedInputs.toType);
      }
    }
  }, [savedInputs?.toPrice, savedInputs?.toType]);

  // Fetch price when toAsset changes
  useEffect(() => {
    if (!toAsset.trim()) {
      setToPrice(null);
      setToType(null);
      return;
    }

    const assetKey = toAsset.toUpperCase().trim();

    // Check if there's a price override from a preceding Price Target node
    if (priceOverrides[assetKey] !== undefined) {
      setToPrice(priceOverrides[assetKey]);
      setToType('target');
      return;
    }

    // Check if asset is in holdings
    const holdingMatch = holdings.find(h => h.ticker === assetKey);
    if (holdingMatch && holdingMatch.price) {
      setToPrice(holdingMatch.price);
      setToType(holdingMatch.type);
      return;
    }

    // Skip fetch on initial load if we have saved price
    if (!isInitialized && savedInputs?.toPrice !== undefined) {
      return;
    }

    // Skip fetch if the asset matches what's in savedInputs and has a valid price
    if (savedInputs?.toAsset?.toUpperCase() === assetKey && savedInputs?.toPrice != null) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingPrice(true);
      const { price, type } = await fetchPrice(assetKey);
      setToPrice(price);
      setToType(type);
      setIsFetchingPrice(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [toAsset, holdings, isInitialized, savedInputs?.toPrice, savedInputs?.toAsset, priceOverrides]);

  // Save inputs when they change
  useEffect(() => {
    if (!isInitialized) return;
    const callback = onInputChangeRef.current;
    if (callback) {
      callback(id, {
        toAsset,
        toPrice,
        toType,
      });
    }
  }, [isInitialized, id, toAsset, toPrice, toType]);

  // Notify parent of all-in changes
  useEffect(() => {
    const callback = onAllInChangeRef.current;
    if (!callback) return;

    if (toAsset.trim() && toPrice && allInAmount > 0) {
      callback(id, {
        toAsset: toAsset.toUpperCase().trim(),
        toPrice,
        toType,
        totalValue,
        allInAmount,
      });
    } else {
      callback(id, null);
    }
  }, [toAsset, toPrice, toType, totalValue, allInAmount, id]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[280px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-yellow-500 !w-3 !h-3"
      />

      <div className="bg-yellow-500 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>All-In</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-yellow-600 rounded px-1.5 py-0.5 text-sm"
          title="Remove all-in"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="text-xs text-zinc-500">
          Convert entire portfolio into one asset
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Target Asset (ticker)</label>
          <input
            type="text"
            value={toAsset}
            onChange={(e) => setToAsset(e.target.value.toUpperCase())}
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="e.g. BTC, ETH, SPY"
          />
          {isFetchingPrice && (
            <div className="text-xs text-zinc-500 mt-1">Fetching price...</div>
          )}
          {toPrice !== null && !isFetchingPrice && (
            <div className={`text-xs mt-1 ${toType === 'target' ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-500'}`}>
              Price: ${formatPrice(toPrice)} {toType === 'target' ? '(from target)' : `(${toType})`}
            </div>
          )}
          {toAsset && toPrice === null && !isFetchingPrice && (
            <div className="text-xs text-red-500 mt-1">Price not found</div>
          )}
        </div>

        {totalValue > 0 && (
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-2">
            <div className="text-xs text-zinc-500">Total Portfolio Value</div>
            <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              ${formatValue(totalValue)}
            </div>
          </div>
        )}

        {toAsset && toPrice && allInAmount > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">All-In Result</div>
            <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
              {allInAmount.toFixed(6)} {toAsset.toUpperCase()}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              @ ${formatPrice(toPrice)} per unit
            </div>
          </div>
        )}

        {/* Chain buttons */}
        <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 mt-3">
          <div className="text-xs text-zinc-500 mb-2">Chain another action:</div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => onAddChainedNode?.(id, 'rotate')}
              className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded text-xs hover:bg-orange-200 dark:hover:bg-orange-900/50"
            >
              + Rotate
            </button>
            <button
              onClick={() => onAddChainedNode?.(id, 'sell')}
              className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900/50"
            >
              + Sell
            </button>
            <button
              onClick={() => onAddChainedNode?.(id, 'buy')}
              className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/50"
            >
              + Buy
            </button>
            <button
              onClick={() => onAddChainedNode?.(id, 'priceTarget')}
              className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded text-xs hover:bg-cyan-200 dark:hover:bg-cyan-900/50"
            >
              + Target
            </button>
            <button
              onClick={() => onAddChainedNode?.(id, 'allIn')}
              className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded text-xs hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
            >
              + All-In
            </button>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-yellow-500 !w-3 !h-3"
      />
    </div>
  );
}
