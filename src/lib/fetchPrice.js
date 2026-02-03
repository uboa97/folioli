export async function fetchPrice(symbol) {
  const startTime = performance.now();
  const stack = new Error().stack;

  console.groupCollapsed(`[API] Fetching ${symbol}...`);
  console.log('Call stack:', stack);
  console.groupEnd();

  try {
    const res = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`);
    const duration = (performance.now() - startTime).toFixed(0);

    if (!res.ok) {
      console.warn(`[API] ${symbol} failed (${res.status}) in ${duration}ms`);
      return { price: null, marketCap: null, type: 'unknown' };
    }

    const data = await res.json();
    const priceStr = data.price ? `$${data.price.toLocaleString()}` : 'N/A';
    const mcapStr = data.marketCap ? `$${(data.marketCap / 1e9).toFixed(2)}B` : 'N/A';
    console.log(`[API] ${symbol}: ${priceStr} | MCap: ${mcapStr} | Type: ${data.type} | ${duration}ms`);

    return data;
  } catch (err) {
    const duration = (performance.now() - startTime).toFixed(0);
    console.error(`[API] ${symbol} error in ${duration}ms:`, err.message);
    return { price: null, marketCap: null, type: 'unknown' };
  }
}
