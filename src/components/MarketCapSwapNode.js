'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchPrice } from '@/lib/fetchPrice';

function formatPrice(price) {
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function formatMarketCap(value) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function getDirectAssetData(ticker) {
  if (!ticker) return null;
  const key = ticker.toUpperCase().trim();
  if (key === 'USD' || key === 'CASH') {
    return { price: 1, marketCap: null, type: 'cash' };
  }
  return null;
}

export default function MarketCapSwapNode({ data, id }) {
  const { onInputChange, onRemove, savedInputs } = data;
  const savedFromDirectData = getDirectAssetData(savedInputs?.fromAsset);
  const savedToDirectData = getDirectAssetData(savedInputs?.toAsset);

  const [fromAsset, setFromAsset] = useState(savedInputs?.fromAsset || '');
  const [toAsset, setToAsset] = useState(savedInputs?.toAsset || '');
  const [fromPrice, setFromPrice] = useState(savedInputs?.fromPrice ?? savedFromDirectData?.price ?? null);
  const [toPrice, setToPrice] = useState(savedInputs?.toPrice ?? savedToDirectData?.price ?? null);
  const [fromMarketCap, setFromMarketCap] = useState(savedInputs?.fromMarketCap ?? savedFromDirectData?.marketCap ?? null);
  const [toMarketCap, setToMarketCap] = useState(savedInputs?.toMarketCap ?? savedToDirectData?.marketCap ?? null);
  const [fromType, setFromType] = useState(savedInputs?.fromType ?? savedFromDirectData?.type ?? null);
  const [toType, setToType] = useState(savedInputs?.toType ?? savedToDirectData?.type ?? null);
  const [isFetchingFromData, setIsFetchingFromData] = useState(false);
  const [isFetchingToData, setIsFetchingToData] = useState(false);
  const fromRequestIdRef = useRef(0);
  const toRequestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++fromRequestIdRef.current;

    const assetKey = fromAsset.toUpperCase().trim();
    if (!assetKey) {
      return;
    }

    if (assetKey === 'USD' || assetKey === 'CASH') {
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingFromData(true);
      const { price, marketCap, type } = await fetchPrice(assetKey);
      if (requestId !== fromRequestIdRef.current) return;
      setFromPrice(price);
      setFromMarketCap(marketCap);
      setFromType(type);
      setIsFetchingFromData(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [fromAsset]);

  useEffect(() => {
    const requestId = ++toRequestIdRef.current;

    const assetKey = toAsset.toUpperCase().trim();
    if (!assetKey) {
      return;
    }

    if (assetKey === 'USD' || assetKey === 'CASH') {
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingToData(true);
      const { price, marketCap, type } = await fetchPrice(assetKey);
      if (requestId !== toRequestIdRef.current) return;
      setToPrice(price);
      setToMarketCap(marketCap);
      setToType(type);
      setIsFetchingToData(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [toAsset]);

  useEffect(() => {
    if (onInputChange) {
      onInputChange(id, {
        fromAsset,
        toAsset,
        fromPrice,
        toPrice,
        fromMarketCap,
        toMarketCap,
        fromType,
        toType,
      });
    }
  }, [id, fromAsset, toAsset, fromPrice, toPrice, fromMarketCap, toMarketCap, fromType, toType, onInputChange]);

  const handleFromAssetChange = (value) => {
    const nextValue = value.toUpperCase();
    const direct = getDirectAssetData(nextValue);
    setIsFetchingFromData(false);
    setFromAsset(nextValue);
    if (!nextValue.trim()) {
      setFromPrice(null);
      setFromMarketCap(null);
      setFromType(null);
      return;
    }
    if (direct) {
      setFromPrice(direct.price);
      setFromMarketCap(direct.marketCap);
      setFromType(direct.type);
      return;
    }
    setFromPrice(null);
    setFromMarketCap(null);
    setFromType(null);
  };

  const handleToAssetChange = (value) => {
    const nextValue = value.toUpperCase();
    const direct = getDirectAssetData(nextValue);
    setIsFetchingToData(false);
    setToAsset(nextValue);
    if (!nextValue.trim()) {
      setToPrice(null);
      setToMarketCap(null);
      setToType(null);
      return;
    }
    if (direct) {
      setToPrice(direct.price);
      setToMarketCap(direct.marketCap);
      setToType(direct.type);
      return;
    }
    setToPrice(null);
    setToMarketCap(null);
    setToType(null);
  };

  const swappedPrice = fromPrice !== null && fromMarketCap && toMarketCap !== null
    ? fromPrice * (toMarketCap / fromMarketCap)
    : null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[330px]">
      <div className="bg-cyan-600 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Market Cap Swap</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-cyan-700 rounded px-1.5 py-0.5 text-sm"
          title="Remove market cap swap"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Asset</label>
            <input
              type="text"
              value={fromAsset}
              onChange={(e) => handleFromAssetChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g. BTC"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Use Market Cap Of</label>
            <input
              type="text"
              value={toAsset}
              onChange={(e) => handleToAssetChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g. ETH"
            />
          </div>
        </div>

        <div className="text-xs text-zinc-500 space-y-1">
          {fromAsset && (
            <div>
              {isFetchingFromData
                ? 'Fetching asset data...'
                : (fromPrice !== null
                  ? `${fromAsset.toUpperCase()}: $${formatPrice(fromPrice)} (${fromType}) | MCap: ${fromMarketCap ? formatMarketCap(fromMarketCap) : 'N/A'}`
                  : 'Asset data not found')}
            </div>
          )}
          {toAsset && (
            <div>
              {isFetchingToData
                ? 'Fetching comparison market cap...'
                : (toPrice !== null || toMarketCap !== null
                  ? `${toAsset.toUpperCase()}: Price $${toPrice !== null ? formatPrice(toPrice) : 'N/A'} (${toType || 'unknown'}) | MCap: ${toMarketCap ? formatMarketCap(toMarketCap) : 'N/A'}`
                  : 'Comparison asset data not found')}
            </div>
          )}
        </div>

        {swappedPrice !== null && fromAsset && toAsset && (
          <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded p-2">
            <div className="text-sm text-cyan-700 dark:text-cyan-400">
              If
              {' '}
              <span className="font-semibold">{fromAsset.toUpperCase()}</span>
              {' '}
              had
              {' '}
              <span className="font-semibold">{toAsset.toUpperCase()}</span>
              {' '}
              market cap, its price would be:
            </div>
            <div className="text-base font-semibold text-cyan-700 dark:text-cyan-400 mt-1">
              ${formatPrice(swappedPrice)}
            </div>
          </div>
        )}

        {swappedPrice === null && fromAsset && toAsset && (
          <div className="text-xs text-amber-600 dark:text-amber-400">
            Could not compute price. Both assets need valid price and market cap data.
          </div>
        )}
      </div>
    </div>
  );
}
