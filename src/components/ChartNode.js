'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import TickerSearch from './TickerSearch';

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: '5Y', days: 1825 },
];

function formatPrice(price) {
  if (price == null) return 'N/A';
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 0.01) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  return price.toLocaleString('en-US', { maximumFractionDigits: 8 });
}

function formatRatio(value) {
  if (value == null) return 'N/A';
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  if (value >= 0.0001) return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  return value.toExponential(3);
}

function formatDateShort(ts) {
  const d = new Date(ts);
  const month = d.toLocaleString('en-US', { month: 'short' });
  return `${month} ${d.getDate()}`;
}

function formatDateLong(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Find the index in `arr` (sorted by .t) whose timestamp is closest to target
function nearestIndex(arr, target) {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].t < target) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(arr[lo - 1].t - target) < Math.abs(arr[lo].t - target)) {
    return lo - 1;
  }
  return lo;
}

async function fetchHistory(ticker, days, requestId, requestRef) {
  const res = await fetch(`/api/price-history?symbol=${encodeURIComponent(ticker)}&days=${days}`, {
    cache: 'no-store',
  });
  if (requestId !== requestRef.current) return null;
  if (!res.ok) return { error: 'Failed to fetch', points: [], type: null };
  const data = await res.json();
  if (requestId !== requestRef.current) return null;
  if (!data.points || data.points.length === 0) {
    return { error: 'No data available', points: [], type: data.type || null };
  }
  return { points: data.points, type: data.type, error: null };
}

export default function ChartNode({ data, id }) {
  const { onInputChange, onRemove, savedInputs } = data;

  const [mode, setMode] = useState(savedInputs?.mode || 'single');
  const [asset, setAsset] = useState(savedInputs?.asset || '');
  const [denomAsset, setDenomAsset] = useState(savedInputs?.denomAsset || '');
  const [rangeDays, setRangeDays] = useState(savedInputs?.rangeDays ?? 30);
  const [points, setPoints] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);
  const requestIdRef = useRef(0);
  const isInitializedRef = useRef(false);

  // Persist inputs
  useEffect(() => {
    if (onInputChange) {
      onInputChange(id, { mode, asset, denomAsset, rangeDays });
    }
  }, [id, mode, asset, denomAsset, rangeDays, onInputChange]);

  // Fetch history when inputs change
  useEffect(() => {
    const ticker = asset.toUpperCase().trim();
    const denom = denomAsset.toUpperCase().trim();
    const requestId = ++requestIdRef.current;

    if (!ticker) {
      setPoints([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (mode === 'compare' && !denom) {
      setPoints([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (mode === 'single') {
          const result = await fetchHistory(ticker, rangeDays, requestId, requestIdRef);
          if (!result) return;
          if (result.error) {
            setError(result.error);
            setPoints([]);
          } else {
            setPoints(result.points);
          }
        } else {
          // Compare mode: fetch both, then divide aligned by timestamp
          const [a, b] = await Promise.all([
            fetchHistory(ticker, rangeDays, requestId, requestIdRef),
            fetchHistory(denom, rangeDays, requestId, requestIdRef),
          ]);
          if (!a || !b) return;
          if (a.error || a.points.length === 0) {
            setError(`No data for ${ticker}`);
            setPoints([]);
            return;
          }
          if (b.error || b.points.length === 0) {
            setError(`No data for ${denom}`);
            setPoints([]);
            return;
          }
          // Use the series with fewer points as the timeline (typically stock = daily)
          // and look up the other series' nearest point per timestamp.
          const [base, other, baseIsNumerator] = a.points.length <= b.points.length
            ? [a.points, b.points, true]
            : [b.points, a.points, false];

          const ratioPoints = [];
          for (const pt of base) {
            const idx = nearestIndex(other, pt.t);
            const otherPt = other[idx];
            if (!otherPt || otherPt.p === 0) continue;
            const ratio = baseIsNumerator
              ? pt.p / otherPt.p
              : otherPt.p / pt.p;
            if (Number.isFinite(ratio) && ratio > 0) {
              ratioPoints.push({ t: pt.t, p: ratio });
            }
          }
          if (ratioPoints.length === 0) {
            setError('Could not align price data');
            setPoints([]);
          } else {
            setPoints(ratioPoints);
          }
        }
      } catch {
        if (requestId !== requestIdRef.current) return;
        setError('Failed to fetch');
        setPoints([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }, isInitializedRef.current ? 350 : 0);
    isInitializedRef.current = true;

    return () => clearTimeout(timer);
  }, [mode, asset, denomAsset, rangeDays]);

  const stats = useMemo(() => {
    if (!points || points.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const pt of points) {
      if (pt.p < min) min = pt.p;
      if (pt.p > max) max = pt.p;
    }
    const first = points[0].p;
    const last = points[points.length - 1].p;
    const change = first ? ((last - first) / first) * 100 : 0;
    return { min, max, first, last, change };
  }, [points]);

  const WIDTH = 320;
  const HEIGHT = 140;
  const PAD_LEFT = 4;
  const PAD_RIGHT = 4;
  const PAD_TOP = 6;
  const PAD_BOTTOM = 16;

  const path = useMemo(() => {
    if (!points || points.length === 0 || !stats) return null;
    const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const minT = points[0].t;
    const maxT = points[points.length - 1].t;
    const tRange = Math.max(maxT - minT, 1);
    const pRange = Math.max(stats.max - stats.min, stats.max * 0.0001 || 0.0001);

    const xs = [];
    const ys = [];
    let d = '';
    points.forEach((pt, i) => {
      const x = PAD_LEFT + ((pt.t - minT) / tRange) * innerW;
      const y = PAD_TOP + (1 - (pt.p - stats.min) / pRange) * innerH;
      xs.push(x);
      ys.push(y);
      d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    const area = `${d} L ${xs[xs.length - 1].toFixed(2)} ${(PAD_TOP + innerH).toFixed(2)} L ${xs[0].toFixed(2)} ${(PAD_TOP + innerH).toFixed(2)} Z`;

    return { line: d, area, xs, ys };
  }, [points, stats]);

  const handleMove = (e) => {
    if (!path || !points.length) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xRel = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < path.xs.length; i++) {
      const dx = Math.abs(path.xs[i] - xRel);
      if (dx < best) {
        best = dx;
        nearest = i;
      }
    }
    setHoverIdx(nearest);
  };

  const handleLeave = () => setHoverIdx(null);

  const isUp = stats ? stats.change >= 0 : true;
  const lineColor = isUp ? '#10b981' : '#ef4444';
  const lineColorDim = isUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';

  const displayPrice = hoverIdx !== null && points[hoverIdx]
    ? points[hoverIdx].p
    : stats?.last;
  const displayDate = hoverIdx !== null && points[hoverIdx]
    ? points[hoverIdx].t
    : (points.length ? points[points.length - 1].t : null);

  const isCompare = mode === 'compare';
  const tickerUpper = asset.toUpperCase();
  const denomUpper = denomAsset.toUpperCase();

  const valueDisplay = isCompare
    ? formatRatio(displayPrice)
    : `$${formatPrice(displayPrice)}`;
  const valueSuffix = isCompare && denomUpper ? ` ${denomUpper}` : '';

  const swapAssets = () => {
    const a = asset;
    setAsset(denomAsset);
    setDenomAsset(a);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-lg min-w-[340px]">
      <div className="bg-sky-600 text-white px-4 py-2 rounded-t-lg font-semibold flex justify-between items-center">
        <span>Chart</span>
        <button
          onClick={() => onRemove?.(id)}
          className="text-white/70 hover:text-white hover:bg-sky-700 rounded px-1.5 py-0.5 text-sm"
          title="Remove chart"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-1">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 px-2 py-1 text-xs rounded ${mode === 'single' ? 'bg-sky-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
          >
            Single
          </button>
          <button
            onClick={() => setMode('compare')}
            className={`flex-1 px-2 py-1 text-xs rounded ${mode === 'compare' ? 'bg-sky-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
          >
            Compare
          </button>
        </div>

        {isCompare ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">Asset</label>
              <TickerSearch
                value={asset}
                onSelect={(val) => setAsset(val.toUpperCase())}
                className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. BTC"
              />
            </div>
            <button
              onClick={swapAssets}
              disabled={!asset && !denomAsset}
              className="px-1.5 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              title="Swap assets"
            >
              ⇄
            </button>
            <div className="flex-1">
              <label className="block text-xs text-zinc-500 mb-1">Denominated In</label>
              <TickerSearch
                value={denomAsset}
                onSelect={(val) => setDenomAsset(val.toUpperCase())}
                className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. ETH"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Asset</label>
            <TickerSearch
              value={asset}
              onSelect={(val) => setAsset(val.toUpperCase())}
              className="w-full px-2 py-1.5 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="e.g. BTC, AAPL"
            />
          </div>
        )}

        {(asset && (!isCompare || denomAsset)) && (
          <>
            <div className="flex gap-1">
              {RANGES.map(r => (
                <button
                  key={r.label}
                  onClick={() => setRangeDays(r.days)}
                  className={`flex-1 px-2 py-1 text-xs rounded ${rangeDays === r.days ? 'bg-sky-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {isCompare && (
              <div className="text-xs text-zinc-500">
                {tickerUpper} priced in {denomUpper}
              </div>
            )}

            {stats && (
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-semibold text-zinc-800 dark:text-zinc-100">
                    {valueDisplay}<span className="text-sm font-normal text-zinc-500">{valueSuffix}</span>
                  </div>
                  {displayDate && (
                    <div className="text-xs text-zinc-500">{formatDateLong(displayDate)}</div>
                  )}
                </div>
                <div className={`text-sm font-medium ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isUp ? '+' : ''}{stats.change.toFixed(2)}%
                </div>
              </div>
            )}

            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 z-10">
                  Loading chart...
                </div>
              )}
              {!isLoading && error && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-amber-600 dark:text-amber-400 z-10">
                  {error}
                </div>
              )}
              <svg
                width="100%"
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="block"
                onMouseMove={handleMove}
                onMouseLeave={handleLeave}
              >
                {path && (
                  <>
                    <path d={path.area} fill={lineColorDim} stroke="none" />
                    <path d={path.line} fill="none" stroke={lineColor} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
                    {hoverIdx !== null && path.xs[hoverIdx] !== undefined && (
                      <>
                        <line
                          x1={path.xs[hoverIdx]}
                          x2={path.xs[hoverIdx]}
                          y1={PAD_TOP}
                          y2={HEIGHT - PAD_BOTTOM}
                          stroke="#9ca3af"
                          strokeWidth="0.75"
                          strokeDasharray="2 2"
                        />
                        <circle
                          cx={path.xs[hoverIdx]}
                          cy={path.ys[hoverIdx]}
                          r="3"
                          fill={lineColor}
                          stroke="white"
                          strokeWidth="1.5"
                        />
                      </>
                    )}
                  </>
                )}
              </svg>
              {stats && points.length > 1 && (
                <div className="flex justify-between text-[10px] text-zinc-500 -mt-3 px-1">
                  <span>{formatDateShort(points[0].t)}</span>
                  <span>{formatDateShort(points[points.length - 1].t)}</span>
                </div>
              )}
            </div>

            {stats && (
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Low: <span className="text-zinc-700 dark:text-zinc-300">{isCompare ? formatRatio(stats.min) : `$${formatPrice(stats.min)}`}</span></span>
                <span>High: <span className="text-zinc-700 dark:text-zinc-300">{isCompare ? formatRatio(stats.max) : `$${formatPrice(stats.max)}`}</span></span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
