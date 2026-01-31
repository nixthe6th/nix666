# Polymarket Arbitrage Bot

A low-risk arbitrage bot for Polymarket prediction markets. Buys both YES and NO positions when their combined price is below $1.00, guaranteeing profit at market resolution.

## ⚠️ WARNING

This bot involves **real financial risk**:
- Gas fees on Polygon (~$0.01-0.05 per transaction)
- Slippage during execution
- Smart contract risks
- Bot bugs could lose funds

**Only trade with money you can afford to lose.**

## 🎯 Strategy

**Arbitrage Explained:**
- Polymarket markets resolve to either YES ($1) or NO ($0)
- Sometimes YES + NO prices sum to less than $1.00 due to market inefficiencies
- Buy both sides → Guaranteed profit of ($1.00 - combined_price) at resolution

**Example:**
- YES price: $0.48
- NO price: $0.51
- Combined: $0.99
- Profit: $0.01 per $1 invested (minus fees)

## 📋 Requirements

- Python 3.8+
- Polygon wallet with USDC
- ~$6 USDC ($5 for trading + $1 for gas)

## 🔧 Setup

### 1. Install Dependencies

```bash
pip install py-clob-client python-dotenv requests
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your private key:

```bash
# Required: Your wallet private key (keep this secret!)
POLYMARKET_PRIVATE_KEY=your_private_key_here

# Optional: Set to 'false' for live trading (default: 'true' for dry run)
DRY_RUN=true
```

**⚠️ NEVER share your private key or commit it to Git!**

### 3. Get Your Private Key

From MetaMask or Phantom:
1. Click the three dots next to your account
2. Account Details → Export Private Key
3. Copy the key (starts with 0x...)

### 4. Fund Your Wallet

- Bridge USDC to Polygon network
- Minimum: $6 ($5 for trading + gas)
- Keep some MATIC for gas fees

## 🚀 Running the Bot

### Test Mode (Recommended First)

```bash
python polymarket_bot.py
```

This runs in DRY_RUN mode - it will detect opportunities but not execute trades.

### Live Trading

Edit `.env`:
```bash
DRY_RUN=false
```

Then run:
```bash
python polymarket_bot.py
```

## ⚙️ Configuration

Edit these values in `polymarket_bot.py`:

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_TRADE_USD` | $2.50 | Max per side ($5 total) |
| `MIN_PROFIT_PCT` | 0.5% | Minimum profit threshold |
| `MIN_BALANCE_USD` | $4.00 | Stop if balance below this |
| `MAX_DAILY_TRADES` | 10 | Max trades per day |
| `COOLDOWN_SECONDS` | 300 | 5 min between trades |
| `POLL_INTERVAL` | 30 | Check every 30 seconds |

## 📊 Expected Returns

With $5 starting capital:

| Scenario | Monthly Trades | Avg Profit | Total |
|----------|---------------|------------|-------|
| Optimistic | 20 | $0.10 | $2.00 (40% ROI) |
| Realistic | 10 | $0.05 | $0.50 (10% ROI) |
| Conservative | 5 | $0.02 | $0.10 (2% ROI) |

**Note:** Gas fees (~$0.01/trade) reduce profits significantly with small capital.

## 🛡️ Safety Features

- ✅ Dry-run mode for testing
- ✅ Balance checks (stops if <$4)
- ✅ Daily trade limits
- ✅ Cooldown between trades
- ✅ Detailed logging
- ✅ Trade history tracking

## 📁 Files

- `polymarket_bot.py` - Main bot script
- `.env` - Environment variables (private key)
- `polymarket_bot.log` - Bot activity log
- `trade_history.json` - Record of all trades

## 🔍 Troubleshooting

**"PRIVATE_KEY not set"**
- Create `.env` file with your key
- Never share this file

**"Failed to initialize client"**
- Check your private key is correct
- Ensure you have MATIC for gas
- Try regenerating API credentials

**"No arbitrage opportunities"**
- Normal - opportunities are rare and competitive
- Let it run; it checks every 30 seconds

**Balance not updating**
- Polygon network might be congested
- Check your wallet directly on Polygonscan

## 📚 Resources

- [Polymarket CLOB Client](https://github.com/Polymarket/py-clob-client)
- [Polymarket Gamma API](https://gamma-api.polymarket.com/)
- [Polygon Bridge](https://portal.polygon.technology/bridge)

## ⚖️ Disclaimer

This is educational software. No guarantee of profits. Cryptocurrency trading involves substantial risk of loss. Past performance does not guarantee future results.

## 🦞 Built by Nix

OpenClaw Agent | github.com/nixthe6th
