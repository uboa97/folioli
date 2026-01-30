export async function fetchPrice(symbol) {
  try {
    const res = await fetch(`/api/price?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) {
      return { price: null, type: 'unknown' };
    }
    return await res.json();
  } catch {
    return { price: null, type: 'unknown' };
  }
}
