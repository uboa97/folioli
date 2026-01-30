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

async function fetchCryptoPrice(symbol) {
  const id = CRYPTO_IDS[symbol.toUpperCase()];
  if (!id) return null;

  try {
    const res = await fetch(
      `${COINGECKO_API}/simple/price?ids=${id}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data[id]?.usd ?? null;
  } catch {
    return null;
  }
}

async function fetchStockPrice(symbol) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price ?? null;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return Response.json({ error: 'Symbol required' }, { status: 400 });
  }

  // Try crypto first
  const cryptoPrice = await fetchCryptoPrice(symbol);
  if (cryptoPrice !== null) {
    return Response.json({ price: cryptoPrice, type: 'crypto' });
  }

  // Fall back to stock
  const stockPrice = await fetchStockPrice(symbol);
  if (stockPrice !== null) {
    return Response.json({ price: stockPrice, type: 'stock' });
  }

  return Response.json({ price: null, type: 'unknown' });
}
