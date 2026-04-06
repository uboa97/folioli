'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { fetchPrice } from '@/lib/fetchPrice';
import { addRecentTicker } from '@/lib/recentTickers';
import MathInput from './MathInput';
import TickerSearch from './TickerSearch';

function formatPrice(price) {
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function formatValue(value) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Convert a price multiplier (0x to maxMultiplier) to slider position (0 to 1) using log scale
// 1x maps to a defined center point so the slider feels balanced
function multiplierToSlider(mult, maxMult) {
  if (mult <= 0) return 0;
  if (mult >= maxMult) return 1;
  // Use log scale: slider = log(mult) / log(maxMult)
  return Math.log(mult) / Math.log(maxMult);
}

// Convert slider position (0 to 1) to multiplier using log scale
function sliderToMultiplier(pos, maxMult) {
  if (pos <= 0) return 0;
  if (pos >= 1) return maxMult;
  return Math.pow(maxMult, pos);
}

export default function QuickSlidersNode({ data, id }) {
  const { onInputChange, onRemove, savedInputs } = data;

  const [assets, setAssets] = useState(savedInputs?.assets || []);
  const [maxMultiplier, setMaxMultiplier] = useState(savedInputs?.maxMultiplier || 100);
  const [newTicker, setNewTicker] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMaxMult, setEditingMaxMult] = useState(false);
  const [maxMultInput, setMaxMultInput] = useState(String(maxMultiplier));
  const isInitialMount = useRef(true);

  // Persist inputs to parent
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    onInputChange?.(id, { assets, maxMultiplier });
  }, [assets, maxMultiplier, id, onInputChange]);

  const addAsset = useCallback(async () => {
    if (!newTicker.trim() || !newAmount) return;

    const ticker = newTicker.toUpperCase().trim();
    const amount = parseFloat(newAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setIsLoading(true);
    setNewTicker('');
    setNewAmount('');
    addRecentTicker(ticker);

    const { price, type } = await fetchPrice(ticker);

    const newAsset = {
      ticker,
      amount,
      basePrice: price,
      currentPrice: price,
      type,
      multiplier: 1,
    };

    setAssets(prev => [...prev, newAsset]);
    setIsLoading(false);
  }, [newTicker, newAmount]);

  const removeAsset = useCallback((index) => {
    setAssets(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateAmount = useCallback((index, rawAmount) => {
    const amount = parseFloat(rawAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    setAssets(prev => prev.map((asset, i) => {
      if (i !== index) return asset;
      return { ...asset, amount };
    }));
  }, []);

  const updateSlider = useCallback((index, sliderValue) => {
    const mult = sliderToMultiplier(sliderValue, maxMultiplier);
    setAssets(prev => prev.map((asset, i) => {
      if (i !== index) return asset;
      const newPrice = asset.basePrice * mult;
      return { ...asset, multiplier: mult, currentPrice: newPrice };
    }));
  }, [maxMultiplier]);

  const updatePriceManual = useCallback((index, rawPrice) => {
    const price = parseFloat(rawPrice);
    if (!Number.isFinite(price) || price < 0) return;
    setAssets(prev => prev.map((asset, i) => {
      if (i !== index) return asset;
      const mult = asset.basePrice > 0 ? price / asset.basePrice : 0;
      return { ...asset, currentPrice: price, multiplier: mult };
    }));
  }, []);

  const resetSlider = useCallback((index) => {
    setAssets(prev => prev.map((asset, i) => {
      if (i !== index) return asset;
      return { ...asset, currentPrice: asset.basePrice, multiplier: 1 };
    }));
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addAsset();
    }
  };

  const commitMaxMult = () => {
    const val = parseFloat(maxMultInput);
    if (Number.isFinite(val) && val > 1) {
      setMaxMultiplier(val);
      // Clamp existing multipliers
      setAssets(prev => prev.map(asset => {
        if (asset.multiplier > val) {
          return { ...asset, multiplier: val, currentPrice: asset.basePrice * val };
        }
        return asset;
      }));
    } else {
      setMaxMultInput(String(maxMultiplier));
    }
    setEditingMaxMult(false);
  };

  // Compute total values at current slider prices
  const totalValue = assets.reduce((sum, a) => sum + (a.currentPrice || 0) * a.amount, 0);
  const totalBaseValue = assets.reduce((sum, a) => sum + (a.basePrice || 0) * a.amount, 0);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg" style={{ minWidth: '480px' }}>
      <div className="bg-amber-600 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Quick Sliders</span>
        <div className="flex items-center gap-2">
          {totalValue > 0 && (
            <span className="text-sm font-normal opacity-90">
              ${formatValue(totalValue)}
              {totalBaseValue > 0 && totalValue !== totalBaseValue && (
                <span className={`ml-1 text-xs ${totalValue >= totalBaseValue ? 'text-green-200' : 'text-red-200'}`}>
                  ({totalValue >= totalBaseValue ? '+' : ''}{((totalValue / totalBaseValue - 1) * 100).toFixed(1)}%)
                </span>
              )}
            </span>
          )}
          <button
            onClick={() => onRemove?.(id)}
            className="text-white/70 hover:text-white hover:bg-amber-700 rounded px-1.5 py-0.5 text-xs"
            title="Remove"
          >
            x
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Max multiplier setting */}
        <div className="flex items-center justify-between mb-3 text-xs text-zinc-500">
          <span>Max multiplier:</span>
          {editingMaxMult ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={maxMultInput}
                onChange={(e) => setMaxMultInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitMaxMult();
                  if (e.key === 'Escape') { setMaxMultInput(String(maxMultiplier)); setEditingMaxMult(false); }
                }}
                onBlur={commitMaxMult}
                autoFocus
                className="w-16 px-1 py-0.5 text-right text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span>x</span>
            </div>
          ) : (
            <button
              onClick={() => { setMaxMultInput(String(maxMultiplier)); setEditingMaxMult(true); }}
              className="text-amber-600 hover:text-amber-500 font-medium"
            >
              {maxMultiplier}x
            </button>
          )}
        </div>

        {/* Asset list with sliders */}
        <div className="space-y-3 mb-4 max-h-[500px] overflow-y-auto">
          {assets.length === 0 && !isLoading ? (
            <p className="text-zinc-500 text-sm italic">No assets yet</p>
          ) : (
            assets.map((asset, index) => {
              const value = (asset.currentPrice || 0) * asset.amount;
              const baseValue = (asset.basePrice || 0) * asset.amount;
              const pct = totalValue > 0 ? value / totalValue * 100 : 0;
              const pctChange = asset.basePrice > 0 ? ((asset.currentPrice / asset.basePrice) - 1) * 100 : 0;
              const sliderPos = multiplierToSlider(asset.multiplier, maxMultiplier);

              return (
                <div key={index} className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">{asset.ticker}</span>
                      <span className="text-zinc-500 text-xs">
                        {asset.type === 'crypto' ? 'Crypto' : asset.type === 'stock' ? 'Stock' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 w-12 text-right">{pct.toFixed(1)}%</span>
                      <button
                        onClick={() => removeAsset(index)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        x
                      </button>
                    </div>
                  </div>

                  {/* Amount and value row */}
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Qty:</span>
                      <MathInput
                        value={String(asset.amount)}
                        onChange={(val) => updateAmount(index, val)}
                        className="w-20 px-1 py-0.5 text-right text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {value > 0 && (
                        <span className="font-medium text-green-600 dark:text-green-400">
                          ${formatValue(value)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price display and manual input */}
                  <div className="flex items-center justify-between mb-1.5 text-xs">
                    <div className="flex items-center gap-1 text-zinc-500">
                      <span>Base: ${formatPrice(asset.basePrice)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Price: $</span>
                      <MathInput
                        value={asset.currentPrice !== null ? String(Number(asset.currentPrice.toPrecision(8))) : ''}
                        onChange={(val) => updatePriceManual(index, val)}
                        className="w-24 px-1 py-0.5 text-right text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      {pctChange !== 0 && (
                        <span className={`text-xs ${pctChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Logarithmic slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-6 shrink-0">0x</span>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.001"
                        value={sliderPos}
                        onChange={(e) => updateSlider(index, parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-zinc-300 dark:bg-zinc-600 nodrag nopan"
                      />
                      {/* 1x marker */}
                      <div
                        className="absolute top-full mt-0.5 text-[9px] text-zinc-400 -translate-x-1/2 pointer-events-none"
                        style={{ left: `${multiplierToSlider(1, maxMultiplier) * 100}%` }}
                      >
                        1x
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400 w-10 shrink-0 text-right">{maxMultiplier}x</span>
                    <button
                      onClick={() => resetSlider(index)}
                      className="text-xs text-amber-600 hover:text-amber-500 shrink-0"
                      title="Reset to 1x"
                    >
                      ↺
                    </button>
                  </div>

                  {/* Multiplier display */}
                  <div className="text-center mt-1">
                    <span className="text-xs font-mono text-zinc-500">
                      {asset.multiplier < 0.01 ? asset.multiplier.toExponential(1) : asset.multiplier.toFixed(2)}x
                    </span>
                  </div>
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex items-center justify-center py-2 text-zinc-500 text-sm">
              Fetching price...
            </div>
          )}
        </div>

        {/* Allocation bars */}
        {assets.length > 0 && totalValue > 0 && (
          <div className="mb-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-500">Allocation</span>
            </div>
            <div className="space-y-1">
              {assets.map((asset, index) => {
                const value = (asset.currentPrice || 0) * asset.amount;
                const pct = totalValue > 0 ? value / totalValue * 100 : 0;
                return (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="font-mono w-12">{asset.ticker}</span>
                    <div className="flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-zinc-600 dark:text-zinc-400">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add asset form */}
        <div className="flex gap-2">
          <TickerSearch
            value={newTicker}
            onChange={(val) => setNewTicker(val)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ticker"
            wrapperClassName="flex-1"
            className="w-full px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
          <MathInput
            placeholder="Amount"
            value={newAmount}
            onChange={(val) => setNewAmount(val)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="w-24 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
          <button
            onClick={addAsset}
            disabled={isLoading}
            className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
