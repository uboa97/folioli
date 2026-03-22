'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchPrice } from '@/lib/fetchPrice';
import MathInput from './MathInput';
import TickerSearch from './TickerSearch';

function formatPrice(price) {
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function getDirectPrice(ticker) {
  if (!ticker) return null;
  const key = ticker.toUpperCase().trim();
  if (key === 'USD' || key === 'CASH') {
    return { price: 1, type: 'cash' };
  }
  return null;
}

export default function QuickConvertNode({ data, id }) {
  const { onInputChange, onRemove, savedInputs } = data;
  const savedFromDirectPrice = getDirectPrice(savedInputs?.fromAsset);
  const savedToDirectPrice = getDirectPrice(savedInputs?.toAsset);

  const [fromAsset, setFromAsset] = useState(savedInputs?.fromAsset || '');
  const [fromAmount, setFromAmount] = useState(savedInputs?.fromAmount || '');
  const [toAsset, setToAsset] = useState(savedInputs?.toAsset || '');
  const [fromPrice, setFromPrice] = useState(savedInputs?.fromPrice ?? savedFromDirectPrice?.price ?? null);
  const [toPrice, setToPrice] = useState(savedInputs?.toPrice ?? savedToDirectPrice?.price ?? null);
  const [fromType, setFromType] = useState(savedInputs?.fromType ?? savedFromDirectPrice?.type ?? null);
  const [toType, setToType] = useState(savedInputs?.toType ?? savedToDirectPrice?.type ?? null);
  const [isFetchingFromPrice, setIsFetchingFromPrice] = useState(false);
  const [isFetchingToPrice, setIsFetchingToPrice] = useState(false);
  const fromPriceRequestIdRef = useRef(0);
  const toPriceRequestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++fromPriceRequestIdRef.current;

    const assetKey = fromAsset.toUpperCase().trim();
    if (!assetKey) {
      return;
    }
    if (assetKey === 'USD' || assetKey === 'CASH') {
      return;
    }
    const timer = setTimeout(async () => {
      setIsFetchingFromPrice(true);
      const { price, type } = await fetchPrice(assetKey);
      if (requestId !== fromPriceRequestIdRef.current) return;
      setFromPrice(price);
      setFromType(type);
      setIsFetchingFromPrice(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [fromAsset]);

  useEffect(() => {
    const requestId = ++toPriceRequestIdRef.current;

    const assetKey = toAsset.toUpperCase().trim();
    if (!assetKey) {
      return;
    }
    if (assetKey === 'USD' || assetKey === 'CASH') {
      return;
    }
    const timer = setTimeout(async () => {
      setIsFetchingToPrice(true);
      const { price, type } = await fetchPrice(assetKey);
      if (requestId !== toPriceRequestIdRef.current) return;
      setToPrice(price);
      setToType(type);
      setIsFetchingToPrice(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [toAsset]);

  useEffect(() => {
    if (onInputChange) {
      onInputChange(id, {
        fromAsset,
        fromAmount,
        toAsset,
        fromPrice,
        toPrice,
        fromType,
        toType,
      });
    }
  }, [id, fromAsset, fromAmount, toAsset, fromPrice, toPrice, fromType, toType, onInputChange]);

  const parsedFromAmount = fromAmount ? parseFloat(fromAmount) : 0;
  const convertedAmount = parsedFromAmount > 0 && fromPrice && toPrice
    ? (parsedFromAmount * fromPrice) / toPrice
    : 0;

  const handleFromAssetChange = (value) => {
    const nextValue = value.toUpperCase();
    const direct = getDirectPrice(nextValue);
    setIsFetchingFromPrice(false);
    setFromAsset(nextValue);
    if (!nextValue.trim()) {
      setFromPrice(null);
      setFromType(null);
      return;
    }
    if (direct) {
      setFromPrice(direct.price);
      setFromType(direct.type);
      return;
    }
    setFromPrice(null);
    setFromType(null);
  };

  const handleToAssetChange = (value) => {
    const nextValue = value.toUpperCase();
    const direct = getDirectPrice(nextValue);
    setIsFetchingToPrice(false);
    setToAsset(nextValue);
    if (!nextValue.trim()) {
      setToPrice(null);
      setToType(null);
      return;
    }
    if (direct) {
      setToPrice(direct.price);
      setToType(direct.type);
      return;
    }
    setToPrice(null);
    setToType(null);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[300px]">
      <div className="bg-indigo-500 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Quick Convert</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-indigo-600 rounded px-1.5 py-0.5 text-sm"
          title="Remove quick convert"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">From Asset</label>
            <TickerSearch
              value={fromAsset}
              onChange={(val) => handleFromAssetChange(val)}
              className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. BTC"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">To Asset</label>
            <TickerSearch
              value={toAsset}
              onChange={(val) => handleToAssetChange(val)}
              className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. ETH"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Amount ({fromAsset || 'From Asset'})</label>
          <MathInput
            value={fromAmount}
            onChange={(val) => setFromAmount(val)}
            step="any"
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0"
          />
        </div>

        <div className="text-xs text-zinc-500 space-y-1">
          {fromAsset && (
            <div>
              {isFetchingFromPrice ? 'Fetching from price...' : (fromPrice !== null ? `From Price: $${formatPrice(fromPrice)} (${fromType})` : 'From price not found')}
            </div>
          )}
          {toAsset && (
            <div>
              {isFetchingToPrice ? 'Fetching to price...' : (toPrice !== null ? `To Price: $${formatPrice(toPrice)} (${toType})` : 'To price not found')}
            </div>
          )}
        </div>

        {convertedAmount > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded p-2">
            <div className="text-sm text-indigo-700 dark:text-indigo-400">
              {parsedFromAmount.toLocaleString('en-US', { maximumFractionDigits: 8 })} {fromAsset.toUpperCase()} =
              {' '}
              <span className="font-semibold">
                {convertedAmount.toLocaleString('en-US', { maximumFractionDigits: 8 })} {toAsset.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
