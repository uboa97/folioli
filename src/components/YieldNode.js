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

export default function YieldNode({ data, id }) {
  const { holdings = [], onYieldChange, onInputChange, onRemove, onAddChainedNode, savedInputs } = data;
  const onYieldChangeRef = useRef(onYieldChange);
  const onInputChangeRef = useRef(onInputChange);
  onYieldChangeRef.current = onYieldChange;
  onInputChangeRef.current = onInputChange;

  const [asset, setAsset] = useState(savedInputs?.asset || '');
  const [yieldPercent, setYieldPercent] = useState(savedInputs?.yieldPercent || '');
  const [timeAmount, setTimeAmount] = useState(savedInputs?.timeAmount || '');
  const [timeUnit, setTimeUnit] = useState(savedInputs?.timeUnit || 'years');
  const [yieldType, setYieldType] = useState(savedInputs?.yieldType || 'staking'); // 'staking' or 'dividend'
  const [isInitialized, setIsInitialized] = useState(false);

  const selectedHolding = holdings.find(h => h.ticker === asset);
  const assetPrice = selectedHolding?.price || 0;
  const assetAmount = selectedHolding?.amount || 0;
  const assetValue = assetPrice * assetAmount;

  // Convert time to years for calculation
  const timeInYears = timeAmount ? (() => {
    const t = parseFloat(timeAmount);
    switch (timeUnit) {
      case 'days': return t / 365;
      case 'weeks': return t / 52;
      case 'months': return t / 12;
      case 'years': return t;
      default: return t;
    }
  })() : 0;

  // Calculate yield
  const annualYieldRate = yieldPercent ? parseFloat(yieldPercent) / 100 : 0;
  const yieldValue = assetValue * annualYieldRate * timeInYears;
  const yieldAmount = yieldType === 'staking' && assetPrice > 0 ? yieldValue / assetPrice : 0;

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
        yieldPercent,
        timeAmount,
        timeUnit,
        yieldType,
      });
    }
  }, [isInitialized, id, asset, yieldPercent, timeAmount, timeUnit, yieldType]);

  // Notify parent of yield changes
  useEffect(() => {
    const callback = onYieldChangeRef.current;
    if (!callback) return;

    if (asset && yieldPercent && parseFloat(yieldPercent) > 0 && timeAmount && parseFloat(timeAmount) > 0 && yieldValue > 0) {
      callback(id, {
        asset,
        yieldType,
        yieldValue,
        yieldAmount,
        assetPrice,
      });
    } else {
      callback(id, null);
    }
  }, [asset, yieldType, yieldValue, yieldAmount, assetPrice, id]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[280px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-500 !w-3 !h-3"
      />

      <div className="bg-purple-500 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Yield</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-purple-600 rounded px-1.5 py-0.5 text-sm"
          title="Remove yield"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Asset</label>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select asset...</option>
            {holdings.filter(h => h.ticker !== 'USD').map((h) => (
              <option key={h.ticker} value={h.ticker}>
                {h.ticker} ({h.amount} @ ${h.price ? formatPrice(h.price) : 'N/A'})
              </option>
            ))}
          </select>
        </div>

        {asset && selectedHolding && (
          <>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Yield Type</label>
              <div className="flex text-sm">
                <button
                  onClick={() => setYieldType('staking')}
                  className={`flex-1 px-3 py-1.5 rounded-l border ${
                    yieldType === 'staking'
                      ? 'bg-purple-500 text-white border-purple-500'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  Staking
                </button>
                <button
                  onClick={() => setYieldType('dividend')}
                  className={`flex-1 px-3 py-1.5 rounded-r border-t border-r border-b ${
                    yieldType === 'dividend'
                      ? 'bg-purple-500 text-white border-purple-500'
                      : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600'
                  }`}
                >
                  Dividend
                </button>
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {yieldType === 'staking' ? 'Rewards paid in more tokens' : 'Rewards paid in cash (USD)'}
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Annual Yield %</label>
              <div className="relative">
                <input
                  type="number"
                  value={yieldPercent}
                  onChange={(e) => setYieldPercent(e.target.value)}
                  step="any"
                  className="w-full px-2 pr-8 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. 5"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1">Time Period</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={timeAmount}
                  onChange={(e) => setTimeAmount(e.target.value)}
                  step="any"
                  className="flex-1 px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. 1"
                />
                <select
                  value={timeUnit}
                  onChange={(e) => setTimeUnit(e.target.value)}
                  className="px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>
              </div>
            </div>

            {yieldValue > 0 && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-3">
                <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Yield Earned</div>
                <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {yieldType === 'staking' ? (
                    <>{yieldAmount.toFixed(6)} {asset}</>
                  ) : (
                    <>${formatValue(yieldValue)}</>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {yieldType === 'staking' ? (
                    <>Worth ${formatValue(yieldValue)} at current price</>
                  ) : (
                    <>From {assetAmount} {asset} over {timeAmount} {timeUnit}</>
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
            <button
              onClick={() => onAddChainedNode?.(id, 'allIn')}
              className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded text-xs hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
            >
              + All-In
            </button>
            <button
              onClick={() => onAddChainedNode?.(id, 'yield')}
              className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded text-xs hover:bg-purple-200 dark:hover:bg-purple-900/50"
            >
              + Yield
            </button>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-purple-500 !w-3 !h-3"
      />
    </div>
  );
}
