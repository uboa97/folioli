'use client';

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

export default function ProjectedPortfolioNode({ data }) {
  const { projectedHoldings = [], originalHoldings = [] } = data;

  // For percentage calculations, treat negative USD as 0
  const totalValue = projectedHoldings.reduce((sum, h) => {
    if (h.ticker === 'USD' && h.value < 0) return sum;
    return sum + (h.value || 0);
  }, 0);
  const originalTotal = originalHoldings.reduce((sum, h) => sum + (h.value || 0), 0);

  const getChange = (ticker) => {
    const original = originalHoldings.find(h => h.ticker === ticker);
    const projected = projectedHoldings.find(h => h.ticker === ticker);

    if (!original && projected) return { type: 'new', diff: projected.amount };
    if (original && !projected) return { type: 'removed', diff: -original.amount };
    if (original && projected) {
      const diff = projected.amount - original.amount;
      if (Math.abs(diff) < 0.000001) return { type: 'unchanged', diff: 0 };
      return { type: diff > 0 ? 'increased' : 'decreased', diff };
    }
    return { type: 'unchanged', diff: 0 };
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[320px]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-purple-600 !w-3 !h-3"
      />

      <div className="bg-purple-600 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Projected Portfolio</span>
        {totalValue > 0 && (
          <span className="text-sm font-normal opacity-90">${formatValue(totalValue)}</span>
        )}
      </div>

      <div className="p-4">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {projectedHoldings.length === 0 ? (
            <p className="text-zinc-500 text-sm italic">No holdings projected</p>
          ) : (
            projectedHoldings.map((holding) => {
              const change = getChange(holding.ticker);
              return (
                <div
                  key={holding.ticker}
                  className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{holding.ticker}</span>
                    {change.type === 'new' && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                    {change.type === 'increased' && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        +{change.diff.toFixed(4)}
                      </span>
                    )}
                    {change.type === 'decreased' && (
                      <span className="text-xs text-red-600 dark:text-red-400">
                        {change.diff.toFixed(4)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className={holding.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-600 dark:text-zinc-400'}>
                        {holding.amount < 0 ? '' : ''}{holding.amount.toFixed(Math.abs(holding.amount) < 1 ? 6 : 4)}
                      </div>
                      {holding.price !== null && holding.ticker !== 'USD' && (
                        <div className="text-xs text-zinc-500">
                          @ ${formatPrice(holding.price)}
                        </div>
                      )}
                    </div>
                    {holding.value !== null && (
                      <div className={`font-medium min-w-[80px] text-right ${holding.value < 0 ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`}>
                        {holding.value < 0 ? '-$' : '$'}{formatValue(Math.abs(holding.value))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {projectedHoldings.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Allocation Changes</span>
            </div>
            <div className="mt-2 space-y-1">
              {projectedHoldings.map((holding) => {
                const originalHolding = originalHoldings.find(h => h.ticker === holding.ticker);
                const originalPct = originalTotal > 0 && originalHolding
                  ? (originalHolding.value || 0) / originalTotal * 100
                  : 0;
                // Show 0% for negative USD (cash spent)
                const holdingValue = holding.ticker === 'USD' && holding.value < 0 ? 0 : (holding.value || 0);
                const newPct = totalValue > 0 ? holdingValue / totalValue * 100 : 0;
                const pctChange = newPct - originalPct;

                return (
                  <div key={holding.ticker} className="flex items-center gap-2 text-xs">
                    <span className="font-mono w-12">{holding.ticker}</span>
                    <div className="flex-1 bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full transition-all"
                        style={{ width: `${Math.min(newPct, 100)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-zinc-600 dark:text-zinc-400">
                      {newPct.toFixed(1)}%
                    </span>
                    <span className={`w-14 text-right ${Math.abs(pctChange) > 0.1 ? (pctChange > 0 ? 'text-green-600' : 'text-red-600') : 'text-transparent'}`}>
                      {Math.abs(pctChange) > 0.1 ? `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
