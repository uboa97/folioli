export async function fetchHistoricalPrice(symbol, date) {
  const startTime = performance.now();

  try {
    const res = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}&date=${encodeURIComponent(date)}`);
    const duration = (performance.now() - startTime).toFixed(0);

    if (!res.ok) {
      console.warn(`[API] ${symbol} (${date}) failed (${res.status}) in ${duration}ms`);
      return { price: null, resolvedDate: null, type: 'unknown' };
    }

    const data = await res.json();
    const priceStr = data.price ? `$${data.price.toLocaleString()}` : 'N/A';
    const resolved = data.resolvedDate || date;
    console.log(`[API] ${symbol} @ ${resolved}: ${priceStr} | Type: ${data.type} | ${duration}ms`);

    return data;
  } catch (err) {
    const duration = (performance.now() - startTime).toFixed(0);
    console.error(`[API] ${symbol} (${date}) error in ${duration}ms:`, err.message);
    return { price: null, resolvedDate: null, type: 'unknown' };
  }
}
