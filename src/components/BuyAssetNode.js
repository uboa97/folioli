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
  const { holdings = [], priceOverrides = {}, onBuyChange, onInputChange, onRemove, onAddChainedNode, savedInputs } = data;
  const onBuyChangeRef = useRef(onBuyChange);
  const onInputChangeRef = useRef(onInputChange);
  onBuyChangeRef.current = onBuyChange;
  onInputChangeRef.current = onInputChange;

  const [inputMode, setInputMode] = useState(savedInputs?.inputMode || 'usd'); // 'usd' or 'units'
  const [inputValue, setInputValue] = useState(savedInputs?.inputValue || '');
  const [toAsset, setToAsset] = useState(savedInputs?.toAsset || '');
  const [toPrice, setToPrice] = useState(savedInputs?.toPrice ?? null);
  const [toType, setToType] = useState(savedInputs?.toType ?? null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const lastSavedPriceRef = useRef(savedInputs?.toPrice);

  // Calculate derived values based on input mode
  const cashAmount = inputMode === 'usd'
    ? (inputValue ? parseFloat(inputValue) : 0)
    : (inputValue && toPrice ? parseFloat(inputValue) * toPrice : 0);

  const buyAmount = inputMode === 'units'
    ? (inputValue ? parseFloat(inputValue) : 0)
    : (inputValue && toPrice ? parseFloat(inputValue) / toPrice : 0);

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

  // Fetch price when toAsset changes (skip if there's a price override)
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

    // Skip fetch on initial load if we have saved price
    if (!isInitialized && savedInputs?.toPrice !== undefined) {
      return;
    }

    // Skip fetch if the asset matches what's in savedInputs (already fetched by global refresh)
    if (savedInputs?.toAsset?.toUpperCase() === assetKey && savedInputs?.toPrice !== undefined) {
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
  }, [toAsset, isInitialized, savedInputs?.toPrice, savedInputs?.toAsset, priceOverrides]);

  // Save inputs when they change
  useEffect(() => {
    if (!isInitialized) return;
    const callback = onInputChangeRef.current;
    if (callback) {
      callback(id, {
        inputMode,
        inputValue,
        toAsset,
        toPrice,
        toType,
      });
    }
  }, [isInitialized, id, inputMode, inputValue, toAsset, toPrice, toType]);

  // Notify parent of buy changes
  useEffect(() => {
    const callback = onBuyChangeRef.current;
    if (!callback) return;

    if (inputValue && parseFloat(inputValue) > 0 && toAsset.trim() && toPrice && cashAmount > 0 && buyAmount > 0) {
      callback(id, {
        cashAmount,
        toAsset: toAsset.toUpperCase().trim(),
        toPrice,
        toType,
        buyAmount,
      });
    } else {
      callback(id, null);
    }
  }, [inputValue, toAsset, toPrice, toType, cashAmount, buyAmount, id]);

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
            <div className={`text-xs mt-1 ${toType === 'target' ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-500'}`}>
              Price: ${formatPrice(toPrice)} {toType === 'target' ? '(from target)' : `(${toType})`}
            </div>
          )}
          {toAsset && toPrice === null && !isFetchingPrice && (
            <div className="text-xs text-red-500 mt-1">Price not found</div>
          )}
        </div>

        {toAsset && toPrice && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-500">Amount</label>
                <div className="flex text-xs">
                  <button
                    onClick={() => {
                      if (inputMode !== 'usd') {
                        // Convert units to USD when switching
                        if (inputValue && toPrice) {
                          setInputValue(String(parseFloat(inputValue) * toPrice));
                        }
                        setInputMode('usd');
                      }
                    }}
                    className={`px-2 py-0.5 rounded-l border ${
                      inputMode === 'usd'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    USD
                  </button>
                  <button
                    onClick={() => {
                      if (inputMode !== 'units') {
                        // Convert USD to units when switching
                        if (inputValue && toPrice) {
                          setInputValue(String(parseFloat(inputValue) / toPrice));
                        }
                        setInputMode('units');
                      }
                    }}
                    className={`px-2 py-0.5 rounded-r border-t border-r border-b ${
                      inputMode === 'units'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600'
                    }`}
                  >
                    Units
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
                  step="any"
                  className={`w-full ${inputMode === 'usd' ? 'pl-6' : 'pl-2'} pr-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-green-500`}
                  placeholder={inputMode === 'usd' ? '0.00' : '0'}
                />
              </div>
            </div>

            {inputValue && parseFloat(inputValue) > 0 && buyAmount > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2 space-y-1">
                <div className="text-sm text-green-700 dark:text-green-400">
                  {inputMode === 'usd' ? (
                    <>Receive: <span className="font-semibold">{buyAmount.toFixed(6)} {toAsset.toUpperCase()}</span></>
                  ) : (
                    <>Cost: <span className="font-semibold">${formatValue(cashAmount)}</span></>
                  )}
                </div>
              </div>
            )}
          </>
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
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-green-500 !w-3 !h-3"
      />
    </div>
  );
}
