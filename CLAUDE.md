# Folioli - Portfolio Trade Analyzer

A visual node-based interface for analyzing portfolio trades and rotations. Built with Next.js and React Flow.

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **React Flow** (@xyflow/react) - Node-based UI
- **Tailwind CSS 4** - Styling
- **Bun** - Package manager
- **localStorage** - State persistence

## Port Configuration

Runs on port **3002** (configured in package.json scripts)

## Project Structure

```
src/
├── app/
│   ├── api/price/route.js    # Server-side price fetching API
│   ├── page.js                # Main application logic
│   ├── layout.js              # Root layout
│   └── globals.css            # Global styles
├── components/
│   ├── PortfolioNode.js       # Initial portfolio holdings input
│   ├── RotateAssetNode.js     # Asset rotation (sell A, buy B)
│   ├── SellAssetNode.js       # Asset liquidation (sell for cash)
│   ├── BuyAssetNode.js        # Buy asset with cash
│   ├── PriceTargetNode.js     # Hypothetical price scenario
│   └── ProjectedPortfolioNode.js  # Shows projected portfolio state
└── lib/
    └── fetchPrice.js          # Client-side price fetching utility
```

## Architecture

### Node Types

1. **Portfolio Holdings** (blue)
   - Single instance at start
   - Add stocks/crypto with amount
   - Fetches live prices on add
   - Source for all transformations

2. **Rotate Asset** (orange)
   - Sell one asset, buy another
   - Shows value being rotated
   - Calculates amount received based on prices

3. **Sell for Cash** (red)
   - Sell asset for USD
   - Adds to cash position in projected portfolio

4. **Buy with Cash** (green)
   - Spend USD to buy an asset
   - Enter cash amount and target asset
   - Reduces USD, adds purchased asset

5. **Price Target** (cyan)
   - Set hypothetical price for an asset
   - Shows percentage change from current
   - Projected portfolio recalculates values at target price

6. **Projected Portfolio** (purple)
   - Auto-created when first action node added
   - Shows portfolio after all rotations/sells
   - Displays allocation percentages
   - Highlights changes (NEW, +/-, removed assets)

### Data Flow

```
Portfolio Holdings
    ├─→ Rotate Asset Node(s)   ──→ Projected Portfolio
    ├─→ Sell Asset Node(s)     ──→ Projected Portfolio
    ├─→ Buy Asset Node(s)      ──→ Projected Portfolio
    └─→ Price Target Node(s)   ──→ Projected Portfolio
```

All action nodes (Rotate/Sell/Buy/Price Target) connect to a single Projected Portfolio node.

## State Management

### Main State (page.js)

- `holdings` - Current portfolio holdings with prices
- `rotations` - Rotation node calculations (from asset, to asset, amounts)
- `rotationInputs` - Rotation node UI state (dropdowns, inputs)
- `sells` - Sell node calculations
- `sellInputs` - Sell node UI state
- `buys` - Buy node calculations (cash amount, target asset, amounts)
- `buyInputs` - Buy node UI state
- `priceTargets` - Price target node data (asset, target price)
- `priceTargetInputs` - Price target node UI state
- `nodes` - React Flow nodes (positions, types)
- `edges` - React Flow edges (connections)

### Persistence

All state persists to localStorage under key `folioli-state`:
- Reloads on app mount
- Prices refresh in background after load (prevents stale data)
- Saves on every state change

## Price Fetching

### API Route (`/api/price?symbol=TICKER`)

- Server-side to avoid CORS
- Tries CoinGecko first (70+ crypto tickers mapped)
- Falls back to Yahoo Finance for stocks
- Returns `{ price, type }` where type is 'crypto' or 'stock'

### Supported Crypto

BTC, ETH, SOL, DOGE, ADA, XRP, DOT, MATIC, LINK, AVAX, ATOM, UNI, LTC, BCH, NEAR, APT, ARB, OP, SUI, SEI, INJ, TIA, PEPE, SHIB, BONK, WIF, and 40+ more.

## Projected Portfolio Calculation

```javascript
1. Build price override map from price targets
2. Clone holdings with overridden prices applied
3. Apply each rotation:
   - Reduce fromAsset by sellAmount
   - Increase/add toAsset by calculated buyAmount
   - Remove asset if amount <= 0.000001
4. Apply each sell:
   - Reduce asset by sellAmount
   - Accumulate sellValue as cash
   - Remove asset if depleted
5. Apply each buy:
   - Reduce cash by cashAmount
   - Increase/add toAsset by calculated buyAmount
6. Add/update USD holding based on net cash
7. Sort by value descending
```

## Key Features

### Node Management

- Drag nodes to reposition
- Delete nodes with "x" button or Delete key
- Projected Portfolio auto-removes when no action nodes exist
- Edges auto-cleanup on node deletion

### Price Updates

- Fresh prices fetched when adding holdings
- Background refresh on app load (updates stale cached prices)
- Rotation nodes fetch target asset price with 500ms debounce
- Price refresh skips USD/CASH holdings

### UI/UX

- Loading state during hydration (prevents flash)
- Subtle dot background (#2d2d2d, gap 20, size 1)
- React Flow controls (zoom, fit view, pan lock)
- Smooth step edges
- Color-coded nodes and edges by type

## Common Patterns

### Adding a New Node Type

1. Create component in `src/components/`
2. Register in `nodeTypes` (page.js)
3. Add state for node data and inputs
4. Create handler functions (onChange, onRemove)
5. Update projected calculation if needed
6. Add to localStorage save/load
7. Update cleanup in handleNodesChange
8. Pass callbacks in nodesWithData

### State Restoration

Components use `savedInputs` prop to restore UI state from localStorage. Initialize local state with saved values, skip effects on initial mount to avoid unnecessary fetches.

## Development

```bash
bun install
bun run dev  # Runs on http://localhost:3002
```

## Future Considerations

- Multiple portfolio nodes (compare different starting points)
- Time-based analysis (project portfolio value over time)
- Historical price data
- Export/import portfolio configurations
- Undo/redo functionality
- Node grouping/collapsing
