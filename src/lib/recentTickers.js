const STORAGE_KEY = 'folioli-recent-tickers';
const MAX_RECENT = 5;

export function getRecentTickers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function addRecentTicker(ticker) {
  const normalized = ticker.toUpperCase().trim();
  if (!normalized || normalized === 'USD' || normalized === 'CASH') return;
  const recent = getRecentTickers().filter(t => t !== normalized);
  recent.unshift(normalized);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}
