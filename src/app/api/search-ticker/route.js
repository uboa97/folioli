import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query || query.trim().length < 1) {
    return Response.json([]);
  }

  try {
    const data = await yf.search(query.trim(), {}, { validateResult: false });
    const quotes = (data.quotes || [])
      .filter((q) => q.symbol)
      .slice(0, 8)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || '',
        exchange: q.exchDisp || q.exchange || '',
        type: q.quoteType || '',
      }));

    return Response.json(quotes);
  } catch {
    return Response.json([]);
  }
}
