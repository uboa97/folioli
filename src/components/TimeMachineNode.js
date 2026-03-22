'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import MathInput from './MathInput';
import TickerSearch from './TickerSearch';
import { fetchPrice } from '@/lib/fetchPrice';
import { fetchHistoricalPrice } from '@/lib/fetchHistoricalPrice';

const PRESET_OPTIONS = [
  { value: '1w', label: '1 week ago' },
  { value: '1m', label: '1 month ago' },
  { value: '3m', label: '3 months ago' },
  { value: '6m', label: '6 months ago' },
  { value: '1y', label: '1 year ago' },
  { value: 'custom', label: 'Custom date' },
];

function formatPrice(price) {
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function formatPct(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getDirectPrice(ticker) {
  if (!ticker) return null;
  const key = ticker.toUpperCase().trim();
  if (key === 'USD' || key === 'CASH') {
    return { price: 1, type: 'cash' };
  }
  return null;
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayIsoDate() {
  return toIsoDate(new Date());
}

function getTargetDateFromPreset(preset, customDate) {
  if (preset === 'custom') {
    return customDate || '';
  }

  const now = new Date();
  const target = new Date(now);

  if (preset === '1w') {
    target.setDate(target.getDate() - 7);
  } else if (preset === '1m') {
    target.setMonth(target.getMonth() - 1);
  } else if (preset === '3m') {
    target.setMonth(target.getMonth() - 3);
  } else if (preset === '6m') {
    target.setMonth(target.getMonth() - 6);
  } else if (preset === '1y') {
    target.setFullYear(target.getFullYear() - 1);
  }

  return toIsoDate(target);
}

export default function TimeMachineNode({ data, id }) {
  const { onInputChange, onRemove, savedInputs } = data;

  const [asset, setAsset] = useState(savedInputs?.asset || '');
  const [datePreset, setDatePreset] = useState(savedInputs?.datePreset || '1m');
  const [customDate, setCustomDate] = useState(savedInputs?.customDate || '');
  const [quantity, setQuantity] = useState(savedInputs?.quantity || '');
  const [currentPrice, setCurrentPrice] = useState(savedInputs?.currentPrice ?? null);
  const [pastPrice, setPastPrice] = useState(savedInputs?.pastPrice ?? null);
  const [resolvedDate, setResolvedDate] = useState(savedInputs?.resolvedDate ?? null);
  const [currentType, setCurrentType] = useState(savedInputs?.currentType ?? null);
  const [pastType, setPastType] = useState(savedInputs?.pastType ?? null);
  const [isFetchingCurrentPrice, setIsFetchingCurrentPrice] = useState(false);
  const [isFetchingPastPrice, setIsFetchingPastPrice] = useState(false);

  const currentPriceRequestIdRef = useRef(0);
  const pastPriceRequestIdRef = useRef(0);

  const targetDate = useMemo(() => getTargetDateFromPreset(datePreset, customDate), [datePreset, customDate]);
  const directPrice = useMemo(() => getDirectPrice(asset), [asset]);
  const displayedResolvedDate = directPrice ? targetDate : resolvedDate;

  useEffect(() => {
    const requestId = ++currentPriceRequestIdRef.current;

    const assetKey = asset.toUpperCase().trim();
    if (!assetKey) {
      return;
    }

    if (directPrice) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingCurrentPrice(true);
      const { price, type } = await fetchPrice(assetKey);
      if (requestId !== currentPriceRequestIdRef.current) return;
      setCurrentPrice(price);
      setCurrentType(type);
      setIsFetchingCurrentPrice(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [asset, directPrice]);

  useEffect(() => {
    const requestId = ++pastPriceRequestIdRef.current;

    const assetKey = asset.toUpperCase().trim();
    if (!assetKey || !targetDate) {
      return;
    }

    if (directPrice) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingPastPrice(true);
      const { price, type, resolvedDate: fetchedResolvedDate } = await fetchHistoricalPrice(assetKey, targetDate);
      if (requestId !== pastPriceRequestIdRef.current) return;
      setPastPrice(price);
      setPastType(type);
      setResolvedDate(fetchedResolvedDate || targetDate);
      setIsFetchingPastPrice(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [asset, targetDate, directPrice]);

  useEffect(() => {
    if (onInputChange) {
      onInputChange(id, {
        asset,
        datePreset,
        customDate,
        targetDate,
        quantity,
        currentPrice: directPrice ? directPrice.price : currentPrice,
        currentType: directPrice ? directPrice.type : currentType,
        pastPrice: directPrice ? directPrice.price : pastPrice,
        pastType: directPrice ? directPrice.type : pastType,
        resolvedDate: displayedResolvedDate,
      });
    }
  }, [
    id,
    asset,
    datePreset,
    customDate,
    targetDate,
    quantity,
    currentPrice,
    currentType,
    pastPrice,
    pastType,
    displayedResolvedDate,
    directPrice,
    onInputChange,
  ]);

  const parsedQty = quantity ? parseFloat(quantity) : 0;
  const refreshedCurrentPrice = (savedInputs?.asset === asset && savedInputs?.currentPrice !== undefined)
    ? savedInputs.currentPrice
    : currentPrice;
  const refreshedCurrentType = (savedInputs?.asset === asset && savedInputs?.currentType !== undefined)
    ? savedInputs.currentType
    : currentType;
  const effectiveCurrentPrice = directPrice ? directPrice.price : refreshedCurrentPrice;
  const effectivePastPrice = directPrice ? directPrice.price : pastPrice;
  const effectiveCurrentType = directPrice ? directPrice.type : refreshedCurrentType;
  const effectivePastType = directPrice ? directPrice.type : pastType;
  const hasPrices = effectiveCurrentPrice !== null && effectivePastPrice !== null;
  const priceDiff = hasPrices ? effectiveCurrentPrice - effectivePastPrice : 0;
  const pctDiff = hasPrices && effectivePastPrice > 0 ? (priceDiff / effectivePastPrice) * 100 : 0;
  const currentValue = hasPrices && parsedQty > 0 ? parsedQty * effectiveCurrentPrice : 0;
  const pastValue = hasPrices && parsedQty > 0 ? parsedQty * effectivePastPrice : 0;
  const valueDiff = currentValue - pastValue;

  const isUp = priceDiff >= 0;
  const targetDateLabel = displayedResolvedDate || targetDate;

  const handleAssetChange = (value) => {
    const nextValue = value.toUpperCase();
    if (nextValue === asset) return;
    const direct = getDirectPrice(nextValue);

    setAsset(nextValue);

    if (!nextValue.trim()) {
      setCurrentPrice(null);
      setCurrentType(null);
      setPastPrice(null);
      setPastType(null);
      setResolvedDate(null);
      setIsFetchingCurrentPrice(false);
      setIsFetchingPastPrice(false);
      return;
    }

    if (direct) {
      setCurrentPrice(direct.price);
      setCurrentType(direct.type);
      setPastPrice(direct.price);
      setPastType(direct.type);
      setResolvedDate(targetDate || null);
      setIsFetchingCurrentPrice(false);
      setIsFetchingPastPrice(false);
      return;
    }

    setCurrentPrice(null);
    setCurrentType(null);
    setPastPrice(null);
    setPastType(null);
    setResolvedDate(null);
    setIsFetchingCurrentPrice(false);
    setIsFetchingPastPrice(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[330px]">
      <div className="bg-emerald-600 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Time Machine</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-emerald-700 rounded px-1.5 py-0.5 text-sm"
          title="Remove time machine"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Asset</label>
          <TickerSearch
            value={asset}
            onSelect={(val) => handleAssetChange(val)}
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. BTC"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">When</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {PRESET_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Custom Date</label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              disabled={datePreset !== 'custom'}
              max={todayIsoDate()}
              className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1">Shares / Tokens (optional)</label>
          <MathInput
            value={quantity}
            onChange={(val) => setQuantity(val)}
            step="any"
            className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Leave blank to compare price only"
          />
        </div>

        <div className="text-xs text-zinc-500 space-y-1">
          {asset && (
            <div>
              {isFetchingCurrentPrice ? 'Fetching current price...' : (effectiveCurrentPrice !== null ? `Current Price: $${formatPrice(effectiveCurrentPrice)} (${effectiveCurrentType})` : 'Current price not found')}
            </div>
          )}
          {asset && targetDate && (
            <div>
              {isFetchingPastPrice
                ? 'Fetching historical price...'
                : (effectivePastPrice !== null
                  ? `Past Price (${targetDateLabel}): $${formatPrice(effectivePastPrice)} (${effectivePastType})`
                  : 'Historical price not found')}
            </div>
          )}
        </div>

        {asset && hasPrices && (
          <div className={`border rounded p-2 ${isUp ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            <div className={`text-sm ${isUp ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              <span className="font-semibold">{asset.toUpperCase()}</span>
              {' '}
              is
              {' '}
              <span className="font-semibold">{isUp ? 'up' : 'down'}</span>
              {' '}
              <span className="font-semibold">{formatPct(pctDiff)}</span>
              {' '}
              since
              {' '}
              <span className="font-semibold">{targetDateLabel}</span>
            </div>
            <div className={`text-xs mt-1 ${isUp ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              Price change: {priceDiff >= 0 ? '+' : ''}${formatPrice(Math.abs(priceDiff))}
            </div>
            {parsedQty > 0 && (
              <div className={`text-xs mt-1 ${isUp ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {parsedQty.toLocaleString('en-US', { maximumFractionDigits: 8 })} {asset.toUpperCase()} value: ${pastValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} {'->'} ${currentValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                {' '}
                ({valueDiff >= 0 ? '+' : '-'}${Math.abs(valueDiff).toLocaleString('en-US', { maximumFractionDigits: 2 })})
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
