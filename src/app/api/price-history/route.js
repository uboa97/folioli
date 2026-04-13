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

async function fetchCryptoHistory(symbol, days) {
  const id = CRYPTO_IDS[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const res = await fetch(
      `${COINGECKO_API}/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.prices || !Array.isArray(data.prices)) return null;
    const points = data.prices.map(([ts, price]) => ({ t: ts, p: price }));
    return { points, type: 'crypto' };
  } catch {
    return null;
  }
}

async function fetchStockHistory(symbol, days) {
  try {
    const period2 = new Date();
    const period1 = new Date();
    period1.setUTCDate(period1.getUTCDate() - Math.max(days, 2));

    const interval = days <= 365 ? '1d' : '1wk';

    const candles = await yf.historical(symbol, {
      period1,
      period2,
      interval,
    });

    if (!candles || candles.length === 0) return null;

    const points = candles
      .filter(c => c?.close !== undefined && c?.close !== null && c?.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(c => ({ t: c.date.getTime(), p: c.close }));

    if (points.length === 0) return null;

    return { points, type: 'stock' };
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const daysParam = searchParams.get('days');

  if (!symbol) {
    return Response.json({ error: 'Symbol required' }, { status: 400 });
  }

  const days = Math.max(1, Math.min(parseInt(daysParam, 10) || 30, 3650));
  const isKnownCrypto = !!CRYPTO_IDS[symbol.toUpperCase()];

  const cryptoHistory = await fetchCryptoHistory(symbol, days);
  if (cryptoHistory && cryptoHistory.points.length > 0) {
    return Response.json(cryptoHistory);
  }

  if (!isKnownCrypto) {
    const stockHistory = await fetchStockHistory(symbol, days);
    if (stockHistory && stockHistory.points.length > 0) {
      return Response.json(stockHistory);
    }
  }

  return Response.json({ points: [], type: 'unknown' });
}
