'use client';

import { useState, useCallback } from 'react';
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

export default function PortfolioNode({ data, id }) {
  // Use holdings from parent (allows restoration from localStorage)
  const holdings = data.holdings || [];
  const [newTicker, setNewTicker] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addHolding = useCallback(async () => {
    if (!newTicker.trim() || !newAmount) return;

    const ticker = newTicker.toUpperCase().trim();
    const amount = parseFloat(newAmount);

    setIsLoading(true);
    setNewTicker('');
    setNewAmount('');

    const { price, marketCap, type } = await fetchPrice(ticker);

    const newHolding = {
      ticker,
      amount,
      price,
      marketCap,
      type,
      value: price ? price * amount : null,
    };

    const updated = [...holdings, newHolding];
    data.onHoldingsChange?.(id, updated);
    setIsLoading(false);
  }, [holdings, newTicker, newAmount, data, id]);

  const removeHolding = useCallback((index) => {
    const updated = holdings.filter((_, i) => i !== index);
    data.onHoldingsChange?.(id, updated);
  }, [holdings, data, id]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addHolding();
    }
  };

  const totalValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[320px]">
      <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Portfolio Holdings</span>
        <div className="flex items-center gap-2">
          {totalValue > 0 && (
            <span className="text-sm font-normal opacity-90">${formatValue(totalValue)}</span>
          )}
          <button
            onClick={() => data.onDuplicate?.(id)}
            className="text-white/70 hover:text-white hover:bg-blue-700 rounded px-1.5 py-0.5 text-xs"
            title="Duplicate portfolio"
          >
            dup
          </button>
          {data.canRemove && (
            <button
              onClick={() => data.onRemove?.(id)}
              className="text-white/70 hover:text-white hover:bg-blue-700 rounded px-1.5 py-0.5 text-xs"
              title="Remove portfolio"
            >
              x
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {holdings.length === 0 && !isLoading ? (
            <p className="text-zinc-500 text-sm italic">No holdings yet</p>
          ) : (
            holdings.map((holding, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{holding.ticker}</span>
                  <span className="text-zinc-500 text-xs">
                    {holding.type === 'crypto' ? 'Crypto' : holding.type === 'stock' ? 'Stock' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-zinc-600 dark:text-zinc-400">{holding.amount}</div>
                    {holding.price !== null ? (
                      <div className="text-xs text-zinc-500">
                        @ ${formatPrice(holding.price)}
                      </div>
                    ) : (
                      <div className="text-xs text-red-500">Price N/A</div>
                    )}
                  </div>
                  {holding.value !== null && (
                    <div className="font-medium text-green-600 dark:text-green-400 min-w-[80px] text-right">
                      ${formatValue(holding.value)}
                    </div>
                  )}
                  <button
                    onClick={() => removeHolding(index)}
                    className="text-red-500 hover:text-red-700 text-sm ml-1"
                  >
                    x
                  </button>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex items-center justify-center py-2 text-zinc-500 text-sm">
              Fetching price...
            </div>
          )}
        </div>

        {holdings.length > 0 && totalValue > 0 && (
          <div className="mb-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-500">Allocation</span>
            </div>
            <div className="space-y-1">
              {holdings.map((holding, index) => {
                const pct = totalValue > 0 ? (holding.value || 0) / totalValue * 100 : 0;
                return (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="font-mono w-12">{holding.ticker}</span>
                    <div className="flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all"
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

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ticker"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <input
            type="number"
            placeholder="Amount"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="w-24 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={addHolding}
            disabled={isLoading}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {holdings.length > 0 && (
          <div className="space-y-2 mt-3">
            <div className="flex gap-2">
              <button
                onClick={() => data.onAddRotation?.(id)}
                className="flex-1 px-2 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm font-medium"
              >
                + Rotate
              </button>
              <button
                onClick={() => data.onAddSell?.(id)}
                className="flex-1 px-2 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
              >
                + Sell
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => data.onAddBuy?.(id)}
                className="flex-1 px-2 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-medium"
              >
                + Buy
              </button>
              <button
                onClick={() => data.onAddPriceTarget?.(id)}
                className="flex-1 px-2 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 text-sm font-medium"
              >
                + Target
              </button>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-blue-600 !w-3 !h-3"
      />
    </div>
  );
}
