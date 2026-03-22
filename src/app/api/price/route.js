import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const CRYPTO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  XRP: 'ripple',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  ATOM: 'cosmos',
  UNI: 'uniswap',
  LTC: 'litecoin',
  BCH: 'bitcoin-cash',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  SUI: 'sui',
  SEI: 'sei-network',
  INJ: 'injective-protocol',
  TIA: 'celestia',
  PEPE: 'pepe',
  SHIB: 'shiba-inu',
  BONK: 'bonk',
  WIF: 'dogwifcoin',
  FET: 'fetch-ai',
  RNDR: 'render-token',
  IMX: 'immutable-x',
  STX: 'blockstack',
  ALGO: 'algorand',
  FTM: 'fantom',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  AAVE: 'aave',
  MKR: 'maker',
  CRV: 'curve-dao-token',
  LDO: 'lido-dao',
  RUNE: 'thorchain',
  XLM: 'stellar',
  VET: 'vechain',
  HBAR: 'hedera-hashgraph',
  EOS: 'eos',
  XTZ: 'tezos',
  FLOW: 'flow',
  EGLD: 'elrond-erd-2',
  XMR: 'monero',
  QNT: 'quant-network',
  KAVA: 'kava',
  ROSE: 'oasis-network',
  ZEC: 'zcash',
  MINA: 'mina-protocol',
  ENS: 'ethereum-name-service',
  SNX: 'havven',
  COMP: 'compound-governance-token',
  BAT: 'basic-attention-token',
  '1INCH': '1inch',
  SUSHI: 'sushi',
  YFI: 'yearn-finance',
  GRT: 'the-graph',
  CHZ: 'chiliz',
  ENJ: 'enjincoin',
  GALA: 'gala',
  APE: 'apecoin',
  CRO: 'crypto-com-chain',
  CAKE: 'pancakeswap-token',
  GMT: 'stepn',
  KCS: 'kucoin-shares',
};

function parseIsoDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatIsoDateUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCoinGeckoDateUTC(date) {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

async function fetchCryptoData(symbol) {
  const id = CRYPTO_IDS[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const res = await fetch(
      `${COINGECKO_API}/simple/price?ids=${id}&vs_currencies=usd&include_market_cap=true`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      price: data[id]?.usd ?? null,
      marketCap: data[id]?.usd_market_cap ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchCryptoHistoricalData(symbol, targetDate) {
  const id = CRYPTO_IDS[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const dateParam = formatCoinGeckoDateUTC(targetDate);
    const res = await fetch(
      `${COINGECKO_API}/coins/${id}/history?date=${dateParam}&localization=false`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data.market_data?.current_price?.usd ?? null;
    if (price === null) return null;

    return {
      price,
      resolvedDate: formatIsoDateUTC(targetDate),
    };
  } catch {
    return null;
  }
}

async function fetchStockData(symbol) {
  try {
    const result = await yf.quoteSummary(symbol, {
      modules: ['price', 'summaryDetail']
    });

    const price = result.price?.regularMarketPrice ?? null;
    const marketCap = result.price?.marketCap ?? null;

    return { price, marketCap };
  } catch {
    return null;
  }
}

async function fetchStockHistoricalData(symbol, targetDate) {
  try {
    const period1 = new Date(targetDate);
    period1.setUTCDate(period1.getUTCDate() - 7);

    const period2 = new Date(targetDate);
    period2.setUTCDate(period2.getUTCDate() + 2);

    const candles = await yf.historical(symbol, {
      period1,
      period2,
      interval: '1d',
    });

    if (!candles || candles.length === 0) return null;

    const validCandles = candles
      .filter(candle => candle?.close !== undefined && candle?.close !== null && candle?.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (validCandles.length === 0) return null;

    const targetIso = formatIsoDateUTC(targetDate);
    const latestOnOrBeforeTarget = [...validCandles]
      .reverse()
      .find(candle => formatIsoDateUTC(candle.date) <= targetIso);

    const selected = latestOnOrBeforeTarget || validCandles[0];

    return {
      price: selected.close,
      resolvedDate: formatIsoDateUTC(selected.date),
    };
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const dateParam = searchParams.get('date');

  if (!symbol) {
    return Response.json({ error: 'Symbol required' }, { status: 400 });
  }

  if (dateParam) {
    const targetDate = parseIsoDate(dateParam);
    if (!targetDate) {
      return Response.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }

    const today = new Date();
    const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    if (targetDate.getTime() > todayUtc.getTime()) {
      return Response.json({ error: 'Date cannot be in the future.' }, { status: 400 });
    }

    const isKnownCrypto = !!CRYPTO_IDS[symbol.toUpperCase()];

    const cryptoHistoricalData = await fetchCryptoHistoricalData(symbol, targetDate);
    if (cryptoHistoricalData) {
      return Response.json({
        price: cryptoHistoricalData.price,
        marketCap: null,
        type: 'crypto',
        resolvedDate: cryptoHistoricalData.resolvedDate,
      });
    }

    // Don't fall back to stock for known crypto tickers (avoids returning wrong asset)
    if (!isKnownCrypto) {
      const stockHistoricalData = await fetchStockHistoricalData(symbol, targetDate);
      if (stockHistoricalData) {
        return Response.json({
          price: stockHistoricalData.price,
          marketCap: null,
          type: 'stock',
          resolvedDate: stockHistoricalData.resolvedDate,
        });
      }
    }

    return Response.json({ price: null, marketCap: null, type: 'unknown', resolvedDate: null });
  }

  const isKnownCrypto = !!CRYPTO_IDS[symbol.toUpperCase()];

  // Try crypto first
  const cryptoData = await fetchCryptoData(symbol);
  if (cryptoData && cryptoData.price !== null) {
    return Response.json({
      price: cryptoData.price,
      marketCap: cryptoData.marketCap,
      type: 'crypto'
    });
  }

  // Don't fall back to stock for known crypto tickers (avoids returning wrong asset)
  if (!isKnownCrypto) {
    const stockData = await fetchStockData(symbol);
    if (stockData && stockData.price !== null) {
      return Response.json({
        price: stockData.price,
        marketCap: stockData.marketCap,
        type: 'stock'
      });
    }
  }

  return Response.json({ price: null, marketCap: null, type: 'unknown' });
}
