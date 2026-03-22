import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Known crypto tickers — used to inject crypto results that Yahoo search misses
const CRYPTO_NAMES = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  DOGE: 'Dogecoin',
  ADA: 'Cardano',
  XRP: 'XRP',
  DOT: 'Polkadot',
  MATIC: 'Polygon',
  LINK: 'Chainlink',
  AVAX: 'Avalanche',
  ATOM: 'Cosmos',
  UNI: 'Uniswap',
  LTC: 'Litecoin',
  BCH: 'Bitcoin Cash',
  NEAR: 'NEAR Protocol',
  APT: 'Aptos',
  ARB: 'Arbitrum',
  OP: 'Optimism',
  SUI: 'Sui',
  SEI: 'Sei',
  INJ: 'Injective',
  TIA: 'Celestia',
  PEPE: 'Pepe',
  SHIB: 'Shiba Inu',
  BONK: 'Bonk',
  WIF: 'dogwifhat',
  FET: 'Fetch.ai',
  RNDR: 'Render',
  IMX: 'Immutable X',
  STX: 'Stacks',
  ALGO: 'Algorand',
  FTM: 'Fantom',
  SAND: 'The Sandbox',
  MANA: 'Decentraland',
  AXS: 'Axie Infinity',
  AAVE: 'Aave',
  MKR: 'Maker',
  CRV: 'Curve DAO',
  LDO: 'Lido DAO',
  RUNE: 'THORChain',
  XLM: 'Stellar',
  VET: 'VeChain',
  HBAR: 'Hedera',
  EOS: 'EOS',
  XTZ: 'Tezos',
  FLOW: 'Flow',
  EGLD: 'MultiversX',
  XMR: 'Monero',
  QNT: 'Quant',
  KAVA: 'Kava',
  ROSE: 'Oasis Network',
  ZEC: 'Zcash',
  MINA: 'Mina',
  ENS: 'Ethereum Name Service',
  SNX: 'Synthetix',
  COMP: 'Compound',
  BAT: 'Basic Attention Token',
  '1INCH': '1inch',
  SUSHI: 'SushiSwap',
  YFI: 'yearn.finance',
  GRT: 'The Graph',
  CHZ: 'Chiliz',
  ENJ: 'Enjin Coin',
  GALA: 'Gala',
  APE: 'ApeCoin',
  CRO: 'Cronos',
  CAKE: 'PancakeSwap',
  GMT: 'STEPN',
  KCS: 'KuCoin Token',
};

function getCryptoMatches(query) {
  const q = query.toUpperCase().trim();
  const matches = [];

  for (const [ticker, name] of Object.entries(CRYPTO_NAMES)) {
    if (ticker === q || name.toUpperCase().startsWith(q)) {
      matches.push({
        symbol: `${ticker}-USD`,
        name: `${name} USD`,
        exchange: 'Crypto',
        type: 'CRYPTOCURRENCY',
      });
    }
  }

  return matches;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query || query.trim().length < 1) {
    return Response.json([]);
  }

  try {
    const data = await yf.search(query.trim(), {}, { validateResult: false });
    const yahooQuotes = (data.quotes || [])
      .filter((q) => q.symbol)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || '',
        exchange: q.exchDisp || q.exchange || '',
        type: q.quoteType || '',
      }));

    // Inject known crypto matches at the top if Yahoo didn't return them
    const cryptoMatches = getCryptoMatches(query.trim());
    const yahooSymbols = new Set(yahooQuotes.map((q) => q.symbol));
    const injected = cryptoMatches.filter((c) => !yahooSymbols.has(c.symbol));

    const results = [...injected, ...yahooQuotes].slice(0, 8);
    return Response.json(results);
  } catch {
    return Response.json([]);
  }
}
