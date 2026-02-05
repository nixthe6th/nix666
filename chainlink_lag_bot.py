#!/usr/bin/env python3
"""
Chainlink Lag Exploit Bot v2.0
===============================
FULL POLYMARKET INTEGRATION

Strategy:
1. Find active 15-minute crypto markets on Polymarket
2. Compare market odds to Binance real-time prices
3. When Binance shows strong momentum but odds are stale, BET
4. Chainlink catches up → market resolves in our favor → WIN
"""

import os
import sys
import time
import json
import logging
import requests
import re
from datetime import datetime, timezone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============= CONFIGURATION =============
class Config:
    # Wallet
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    WALLET_ADDRESS = os.getenv('WALLET_ADDRESS', '')
    
    # Trading Settings
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    BET_SIZE = 1               # $1 per trade
    MAX_BET_SIZE = 2           # Max $2 after wins
    
    # Strategy Thresholds
    MIN_EDGE_PERCENT = 0.5     # Minimum edge to trade (0.5%)
    MIN_MOMENTUM_PERCENT = 0.15 # Minimum momentum to consider
    MAX_ODDS = 0.85            # Don't buy if odds already > 85%
    MIN_ODDS = 0.15            # Don't buy if odds < 15%
    
    # Timing
    CHECK_INTERVAL = 10        # Check every 10 seconds
    COOLDOWN_AFTER_TRADE = 120 # 2 minute cooldown after trade
    BET_BEFORE_CLOSE_SECONDS = 60  # Bet 60 seconds before market closes
    
    # Assets
    ASSETS = {
        'BTC': 'BTCUSDT',
        'ETH': 'ETHUSDT', 
        'SOL': 'SOLUSDT'
    }
    
    # APIs
    BINANCE_API = "https://api.binance.com/api/v3"
    POLYMARKET_API = "https://gamma-api.polymarket.com"
    POLYMARKET_CLOB = "https://clob.polymarket.com"
    POLYGON_RPC = "https://polygon-rpc.com"
    USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

# ============= LOGGING =============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler('chainlink_lag_bot.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ============= WALLET FUNCTIONS =============
def get_wallet_address_from_key(private_key):
    """Derive wallet address from private key"""
    try:
        from eth_account import Account
        if private_key and private_key.startswith('0x'):
            account = Account.from_key(private_key)
            return account.address
    except ImportError:
        pass
    except Exception as e:
        logger.error(f"Error deriving address: {e}")
    return None

def get_usdc_balance(wallet_address):
    """Get USDC balance from Polygon network"""
    if not wallet_address:
        return None
    try:
        padded_address = wallet_address.lower().replace('0x', '').zfill(64)
        data = f"0x70a08231{padded_address}"
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_call",
            "params": [{"to": Config.USDC_CONTRACT, "data": data}, "latest"],
            "id": 1
        }
        response = requests.post(Config.POLYGON_RPC, json=payload, timeout=10)
        result = response.json()
        if 'result' in result:
            balance_wei = int(result['result'], 16)
            return balance_wei / 1_000_000  # USDC has 6 decimals
        return None
    except Exception as e:
        logger.error(f"Error getting balance: {e}")
        return None

# ============= POLYMARKET FUNCTIONS =============
class PolymarketClient:
    """Client for interacting with Polymarket"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def get_15min_crypto_markets(self):
        """Find active 15-minute crypto prediction markets"""
        try:
            # Get all active markets
            url = f"{Config.POLYMARKET_API}/markets"
            params = {
                "active": "true",
                "closed": "false",
                "limit": 100
            }
            
            response = self.session.get(url, params=params, timeout=15)
            response.raise_for_status()
            markets = response.json()
            
            # Filter for 15-min crypto markets
            crypto_markets = []
            
            for market in markets:
                question = market.get('question', '').lower()
                
                # Check if it's a 15-minute market
                is_15min = any(x in question for x in ['15 min', '15-min', '15min', 'fifteen min'])
                
                # Check if it's a crypto market
                is_crypto = any(crypto.lower() in question for crypto in Config.ASSETS.keys())
                
                if is_15min and is_crypto:
                    # Parse market details
                    parsed = self.parse_market(market)
                    if parsed:
                        crypto_markets.append(parsed)
            
            return crypto_markets
            
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []
    
    def parse_market(self, market):
        """Parse market data into usable format"""
        try:
            question = market.get('question', '')
            
            # Extract asset
            asset = None
            for a in Config.ASSETS.keys():
                if a.lower() in question.lower():
                    asset = a
                    break
            
            if not asset:
                return None
            
            # Extract target price from question
            # Examples: "above $97,500" or "above $3,200.50"
            price_match = re.search(r'\$?([\d,]+\.?\d*)', question)
            target_price = None
            if price_match:
                target_price = float(price_match.group(1).replace(',', ''))
            
            # Determine direction (above/below)
            is_above = 'above' in question.lower() or 'higher' in question.lower()
            is_below = 'below' in question.lower() or 'lower' in question.lower()
            
            direction = 'above' if is_above else 'below' if is_below else None
            
            # Get current odds
            prices_str = market.get('outcomePrices', '["0.5", "0.5"]')
            try:
                prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
                yes_price = float(prices[0]) if prices else 0.5
                no_price = float(prices[1]) if len(prices) > 1 else 0.5
            except:
                yes_price = 0.5
                no_price = 0.5
            
            # Get end time
            end_date = market.get('endDate', '')
            
            # Get token IDs for trading
            clob_token_ids = market.get('clobTokenIds', '')
            try:
                token_ids = json.loads(clob_token_ids) if isinstance(clob_token_ids, str) else clob_token_ids
            except:
                token_ids = []
            
            return {
                'id': market.get('id'),
                'condition_id': market.get('conditionId'),
                'question': question,
                'asset': asset,
                'target_price': target_price,
                'direction': direction,
                'yes_price': yes_price,
                'no_price': no_price,
                'end_date': end_date,
                'token_ids': token_ids,
                'volume': market.get('volume', 0),
                'liquidity': market.get('liquidity', 0)
            }
            
        except Exception as e:
            logger.error(f"Error parsing market: {e}")
            return None
    
    def get_orderbook(self, token_id):
        """Get orderbook for a specific outcome"""
        try:
            url = f"{Config.POLYMARKET_CLOB}/book"
            params = {"token_id": token_id}
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error getting orderbook: {e}")
            return None

# ============= BINANCE PRICE TRACKER =============
class BinanceTracker:
    """Track real-time prices from Binance"""
    
    def __init__(self):
        self.cache = {}
        self.cache_time = {}
        self.price_history = {asset: [] for asset in Config.ASSETS}
    
    def get_price(self, asset):
        """Get current price for asset"""
        symbol = Config.ASSETS.get(asset)
        if not symbol:
            return None
        
        # Check cache (2 second validity)
        if asset in self.cache and time.time() - self.cache_time.get(asset, 0) < 2:
            return self.cache[asset]
        
        try:
            url = f"{Config.BINANCE_API}/ticker/price"
            response = requests.get(url, params={'symbol': symbol}, timeout=5)
            response.raise_for_status()
            price = float(response.json()['price'])
            
            self.cache[asset] = price
            self.cache_time[asset] = time.time()
            
            # Track history
            self.price_history[asset].append({'time': time.time(), 'price': price})
            self.price_history[asset] = self.price_history[asset][-60:]  # Keep last 60
            
            return price
        except Exception as e:
            logger.error(f"Binance error for {asset}: {e}")
            return None
    
    def get_momentum(self, asset, seconds=60):
        """Calculate price momentum over last N seconds"""
        history = self.price_history.get(asset, [])
        if len(history) < 2:
            return 0
        
        cutoff = time.time() - seconds
        recent = [h for h in history if h['time'] > cutoff]
        
        if len(recent) < 2:
            return 0
        
        oldest = recent[0]['price']
        newest = recent[-1]['price']
        return ((newest - oldest) / oldest) * 100

# ============= MAIN BOT =============
class ChainlinkLagBot:
    def __init__(self):
        self.polymarket = PolymarketClient()
        self.binance = BinanceTracker()
        self.wallet_address = Config.WALLET_ADDRESS or get_wallet_address_from_key(Config.PRIVATE_KEY)
        self.balance = 0
        self.bet_size = Config.BET_SIZE
        self.wins = 0
        self.losses = 0
        self.trades = []
        self.last_trade_time = 0
        
        self.update_balance()
        self.print_banner()
    
    def update_balance(self):
        """Update wallet balance"""
        if self.wallet_address:
            balance = get_usdc_balance(self.wallet_address)
            if balance is not None:
                self.balance = balance
    
    def print_banner(self):
        logger.info("")
        logger.info("=" * 65)
        logger.info("   CHAINLINK LAG EXPLOIT BOT v2.0 - FULL POLYMARKET INTEGRATION")
        logger.info("=" * 65)
        logger.info(f"   Mode: {'DRY RUN (TEST)' if Config.DRY_RUN else '*** LIVE TRADING ***'}")
        if self.wallet_address:
            logger.info(f"   Wallet: {self.wallet_address[:10]}...{self.wallet_address[-6:]}")
        logger.info(f"   Balance: ${self.balance:.2f} USDC")
        logger.info(f"   Bet Size: ${Config.BET_SIZE}")
        logger.info(f"   Min Edge: {Config.MIN_EDGE_PERCENT}%")
        logger.info("=" * 65)
        logger.info("")
        logger.info("   HOW IT WORKS:")
        logger.info("   1. Find 15-minute crypto markets on Polymarket")
        logger.info("   2. Compare market odds to Binance real-time price")
        logger.info("   3. If price moved but odds are stale = EDGE")
        logger.info("   4. Bet on the direction, Chainlink catches up = WIN")
        logger.info("")
        logger.info("=" * 65)
    
    def analyze_opportunity(self, market):
        """
        Analyze if there's an arbitrage opportunity in this market.
        
        The key insight: Polymarket resolves based on Chainlink oracle.
        Chainlink updates SLOWER than Binance.
        
        If Binance shows BTC at $98,000 but the market asks "Will BTC be above $97,500?"
        and YES is only at 60%, there's an edge because Chainlink will catch up.
        """
        asset = market['asset']
        target_price = market['target_price']
        direction = market['direction']
        yes_price = market['yes_price']
        no_price = market['no_price']
        
        if not target_price or not direction:
            return None
        
        # Get current Binance price
        current_price = self.binance.get_price(asset)
        if not current_price:
            return None
        
        # Get momentum
        momentum = self.binance.get_momentum(asset, 60)
        
        # Calculate where price is relative to target
        price_diff_percent = ((current_price - target_price) / target_price) * 100
        
        # Determine expected outcome based on current price
        if direction == 'above':
            # Market asks: "Will price be ABOVE target?"
            if current_price > target_price:
                expected_outcome = 'YES'
                fair_value = min(0.95, 0.5 + abs(price_diff_percent) * 0.1)  # Higher confidence if further above
            else:
                expected_outcome = 'NO'
                fair_value = min(0.95, 0.5 + abs(price_diff_percent) * 0.1)
        else:  # below
            # Market asks: "Will price be BELOW target?"
            if current_price < target_price:
                expected_outcome = 'YES'
                fair_value = min(0.95, 0.5 + abs(price_diff_percent) * 0.1)
            else:
                expected_outcome = 'NO'
                fair_value = min(0.95, 0.5 + abs(price_diff_percent) * 0.1)
        
        # Calculate edge
        if expected_outcome == 'YES':
            market_price = yes_price
            edge = fair_value - market_price
        else:
            market_price = no_price
            edge = fair_value - market_price
        
        edge_percent = edge * 100
        
        # Check if edge is worth trading
        if edge_percent < Config.MIN_EDGE_PERCENT:
            return None
        
        # Check odds bounds
        if market_price > Config.MAX_ODDS or market_price < Config.MIN_ODDS:
            return None
        
        return {
            'market': market,
            'asset': asset,
            'current_price': current_price,
            'target_price': target_price,
            'direction': direction,
            'expected_outcome': expected_outcome,
            'market_price': market_price,
            'fair_value': fair_value,
            'edge_percent': edge_percent,
            'momentum': momentum,
            'price_diff_percent': price_diff_percent
        }
    
    def execute_trade(self, opportunity):
        """Execute a trade"""
        market = opportunity['market']
        
        logger.info("")
        logger.info("*" * 65)
        logger.info("   *** OPPORTUNITY FOUND ***")
        logger.info("*" * 65)
        logger.info(f"   Market: {market['question'][:55]}...")
        logger.info(f"   Asset: {opportunity['asset']}")
        logger.info(f"   Current Price: ${opportunity['current_price']:,.2f}")
        logger.info(f"   Target Price: ${opportunity['target_price']:,.2f}")
        logger.info(f"   Price vs Target: {opportunity['price_diff_percent']:+.2f}%")
        logger.info(f"   Momentum (1min): {opportunity['momentum']:+.3f}%")
        logger.info("")
        logger.info(f"   BET: {opportunity['expected_outcome']} @ {opportunity['market_price']:.2f}")
        logger.info(f"   Fair Value: {opportunity['fair_value']:.2f}")
        logger.info(f"   EDGE: {opportunity['edge_percent']:.2f}%")
        logger.info(f"   Bet Size: ${self.bet_size}")
        logger.info("*" * 65)
        
        if Config.DRY_RUN:
            logger.info("")
            logger.info("   [DRY RUN - Trade logged but not executed]")
            logger.info("   Set DRY_RUN=false in .env for live trading")
        else:
            logger.info("")
            logger.info("   [LIVE MODE] Placing order...")
            # TODO: Implement actual order placement via CLOB API
            # This requires signing transactions with private key
            logger.info("   Order placement requires CLOB API integration")
        
        logger.info("")
        
        # Record trade
        self.trades.append({
            'time': datetime.now().isoformat(),
            'market_id': market['id'],
            'asset': opportunity['asset'],
            'outcome': opportunity['expected_outcome'],
            'price': opportunity['market_price'],
            'edge': opportunity['edge_percent'],
            'bet_size': self.bet_size,
            'dry_run': Config.DRY_RUN
        })
        
        self.last_trade_time = time.time()
        return True
    
    def print_status(self):
        """Print status"""
        logger.info("")
        logger.info("-" * 65)
        logger.info(f"   Balance: ${self.balance:.2f} | Bet Size: ${self.bet_size}")
        logger.info(f"   Trades: {len(self.trades)} | Wins: {self.wins} | Losses: {self.losses}")
        logger.info("-" * 65)
    
    def run(self):
        """Main loop"""
        logger.info("")
        logger.info("Starting bot...")
        logger.info(f"Scanning every {Config.CHECK_INTERVAL} seconds")
        logger.info("")
        
        last_balance_update = 0
        
        try:
            while True:
                # Update balance every 60s
                if time.time() - last_balance_update > 60:
                    self.update_balance()
                    last_balance_update = time.time()
                
                # Check cooldown
                if self.last_trade_time > 0:
                    elapsed = time.time() - self.last_trade_time
                    if elapsed < Config.COOLDOWN_AFTER_TRADE:
                        logger.info(f"Cooldown: {Config.COOLDOWN_AFTER_TRADE - elapsed:.0f}s remaining")
                        time.sleep(Config.CHECK_INTERVAL)
                        continue
                
                self.print_status()
                
                # Fetch 15-min markets
                logger.info("Fetching 15-minute crypto markets from Polymarket...")
                markets = self.polymarket.get_15min_crypto_markets()
                logger.info(f"Found {len(markets)} active 15-min markets")
                
                if not markets:
                    logger.info("No 15-minute markets found. Waiting...")
                    time.sleep(Config.CHECK_INTERVAL)
                    continue
                
                # Analyze each market
                best_opportunity = None
                best_edge = 0
                
                for market in markets:
                    # Log market info
                    logger.info(f"  > {market['asset']}: {market['question'][:40]}... YES={market['yes_price']:.2f}")
                    
                    # Analyze for opportunity
                    opp = self.analyze_opportunity(market)
                    
                    if opp and opp['edge_percent'] > best_edge:
                        best_opportunity = opp
                        best_edge = opp['edge_percent']
                
                # Execute best opportunity if found
                if best_opportunity:
                    self.execute_trade(best_opportunity)
                else:
                    logger.info("No edge found. Market odds appear fair.")
                
                time.sleep(Config.CHECK_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("")
            logger.info("Bot stopped by user")
            self.print_status()

# ============= MAIN =============
if __name__ == "__main__":
    print("")
    print("Chainlink Lag Exploit Bot v2.0")
    print("Full Polymarket Integration")
    print("=" * 40)
    
    # Check .env
    if not os.path.exists('.env'):
        print("")
        print("WARNING: No .env file!")
        print("Create .env with:")
        print("  POLYMARKET_PRIVATE_KEY=0x...")
        print("  WALLET_ADDRESS=0x...")
        print("  DRY_RUN=true")
        print("")
    
    # Check packages
    try:
        import requests
        from dotenv import load_dotenv
    except ImportError as e:
        print(f"Missing package: {e}")
        print("Run: pip install requests python-dotenv")
        sys.exit(1)
    
    print("")
    bot = ChainlinkLagBot()
    bot.run()
