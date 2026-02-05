#!/usr/bin/env python3
"""
Chainlink Lag Exploit Bot v1.1
===============================
Strategy: Exploit the delay between Binance real-time prices and Chainlink oracle updates.

FIXES in v1.1:
- Removed CoinGecko (rate limited) - now uses Binance for everything
- Added real wallet balance from Polygon network
- Better rate limiting and caching
"""

import os
import sys
import time
import json
import logging
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============= CONFIGURATION =============
class Config:
    # Wallet
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    
    # Derive wallet address from private key (if provided)
    WALLET_ADDRESS = os.getenv('WALLET_ADDRESS', '')
    
    # Trading Settings
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    BET_SIZE = 1               # $1 per trade
    MAX_BET_SIZE = 2           # Max $2 after wins
    
    # Lag Detection Thresholds
    MIN_LAG_PERCENT = 0.15     # 0.15% minimum price difference to trigger
    MIN_MOMENTUM_PERCENT = 0.1 # 0.1% price move in last minute
    
    # Timing
    CHECK_INTERVAL = 5         # Check every 5 seconds
    COOLDOWN_AFTER_TRADE = 60  # 1 minute cooldown after trade
    COOLDOWN_AFTER_LOSS = 300  # 5 minutes after loss
    
    # Assets to monitor
    ASSETS = {
        'BTC': {'binance_symbol': 'BTCUSDT'},
        'ETH': {'binance_symbol': 'ETHUSDT'},
        'SOL': {'binance_symbol': 'SOLUSDT'}
    }
    
    # APIs
    BINANCE_API = "https://api.binance.com/api/v3"
    POLYGON_RPC = "https://polygon-rpc.com"
    
    # USDC Contract on Polygon
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
        if private_key.startswith('0x'):
            account = Account.from_key(private_key)
            return account.address
    except ImportError:
        logger.warning("eth_account not installed - can't derive address from key")
    except Exception as e:
        logger.error(f"Error deriving address: {e}")
    return None

def get_usdc_balance(wallet_address):
    """Get USDC balance from Polygon network"""
    if not wallet_address:
        return None
    
    try:
        # ERC20 balanceOf function signature
        # balanceOf(address) = 0x70a08231
        padded_address = wallet_address.lower().replace('0x', '').zfill(64)
        data = f"0x70a08231{padded_address}"
        
        payload = {
            "jsonrpc": "2.0",
            "method": "eth_call",
            "params": [{
                "to": Config.USDC_CONTRACT,
                "data": data
            }, "latest"],
            "id": 1
        }
        
        response = requests.post(Config.POLYGON_RPC, json=payload, timeout=10)
        response.raise_for_status()
        result = response.json()
        
        if 'result' in result:
            # USDC has 6 decimals
            balance_wei = int(result['result'], 16)
            balance_usdc = balance_wei / 1_000_000
            return balance_usdc
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting USDC balance: {e}")
        return None

# ============= PRICE TRACKER =============
class PriceTracker:
    """Track prices from Binance to detect momentum and simulate lag"""
    
    def __init__(self):
        self.price_history = {asset: [] for asset in Config.ASSETS}
        self.last_prices = {}
        self.cache = {}
        self.cache_time = {}
        self.CACHE_SECONDS = 2  # Cache prices for 2 seconds to avoid rate limits
    
    def get_binance_price(self, symbol):
        """Get real-time price from Binance"""
        # Check cache
        cache_key = f"binance_{symbol}"
        if cache_key in self.cache:
            if time.time() - self.cache_time.get(cache_key, 0) < self.CACHE_SECONDS:
                return self.cache[cache_key]
        
        try:
            url = f"{Config.BINANCE_API}/ticker/price"
            params = {'symbol': symbol}
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            price = float(data['price'])
            
            # Cache it
            self.cache[cache_key] = price
            self.cache_time[cache_key] = time.time()
            
            return price
        except Exception as e:
            logger.error(f"Binance error for {symbol}: {e}")
            return None
    
    def get_binance_kline(self, symbol, interval='1m', limit=2):
        """Get recent candles to detect momentum"""
        cache_key = f"kline_{symbol}"
        if cache_key in self.cache:
            if time.time() - self.cache_time.get(cache_key, 0) < self.CACHE_SECONDS:
                return self.cache[cache_key]
        
        try:
            url = f"{Config.BINANCE_API}/klines"
            params = {'symbol': symbol, 'interval': interval, 'limit': limit}
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            self.cache[cache_key] = data
            self.cache_time[cache_key] = time.time()
            
            return data
        except Exception as e:
            logger.error(f"Binance kline error for {symbol}: {e}")
            return None
    
    def detect_momentum(self, asset):
        """
        Detect strong price momentum.
        Returns: (momentum_percent, direction) or (None, None)
        
        The strategy: If price is moving hard in one direction,
        Chainlink/Polymarket odds haven't caught up yet.
        """
        symbol = Config.ASSETS[asset]['binance_symbol']
        
        # Get current price
        current_price = self.get_binance_price(symbol)
        if not current_price:
            return None, None
        
        # Get recent candles
        klines = self.get_binance_kline(symbol, '1m', 3)
        if not klines or len(klines) < 2:
            return None, None
        
        # Calculate momentum from last candle
        last_candle = klines[-1]
        prev_candle = klines[-2]
        
        open_price = float(last_candle[1])
        close_price = float(last_candle[4])
        prev_close = float(prev_candle[4])
        
        # Momentum = how much price moved in last 1-2 minutes
        momentum = ((current_price - prev_close) / prev_close) * 100
        
        # Store price history
        self.last_prices[asset] = current_price
        self.price_history[asset].append({
            'time': time.time(),
            'price': current_price,
            'momentum': momentum
        })
        
        # Keep only last 60 data points
        self.price_history[asset] = self.price_history[asset][-60:]
        
        # Determine direction
        if momentum > Config.MIN_MOMENTUM_PERCENT:
            direction = 'UP'
        elif momentum < -Config.MIN_MOMENTUM_PERCENT:
            direction = 'DOWN'
        else:
            direction = None
        
        return momentum, direction

# ============= BOT =============
class ChainlinkLagBot:
    def __init__(self):
        self.tracker = PriceTracker()
        self.wallet_address = None
        self.balance = 0
        self.bet_size = Config.BET_SIZE
        self.wins = 0
        self.losses = 0
        self.trades = []
        self.last_trade_time = 0
        
        # Get wallet address
        if Config.WALLET_ADDRESS:
            self.wallet_address = Config.WALLET_ADDRESS
        elif Config.PRIVATE_KEY:
            self.wallet_address = get_wallet_address_from_key(Config.PRIVATE_KEY)
        
        # Get initial balance
        self.update_balance()
        
        self.print_banner()
    
    def update_balance(self):
        """Update balance from Polygon network"""
        if self.wallet_address:
            balance = get_usdc_balance(self.wallet_address)
            if balance is not None:
                self.balance = balance
                logger.info(f"Wallet balance updated: ${self.balance:.2f} USDC")
            else:
                logger.warning("Could not fetch wallet balance")
        else:
            logger.warning("No wallet address - balance unknown")
    
    def print_banner(self):
        logger.info("=" * 60)
        logger.info("   CHAINLINK LAG EXPLOIT BOT v1.1")
        logger.info("=" * 60)
        logger.info(f"   Mode: {'DRY RUN (TEST)' if Config.DRY_RUN else 'LIVE TRADING'}")
        if self.wallet_address:
            logger.info(f"   Wallet: {self.wallet_address[:10]}...{self.wallet_address[-6:]}")
        logger.info(f"   Balance: ${self.balance:.2f} USDC")
        logger.info(f"   Bet Size: ${Config.BET_SIZE}")
        logger.info(f"   Min Momentum: {Config.MIN_MOMENTUM_PERCENT}%")
        logger.info(f"   Assets: {', '.join(Config.ASSETS.keys())}")
        logger.info("=" * 60)
        logger.info("")
        logger.info("   Strategy: Detect strong momentum on Binance")
        logger.info("   When price moves fast, Chainlink/Polymarket lags behind")
        logger.info("   Bet on the direction before odds adjust")
        logger.info("")
        logger.info("=" * 60)
    
    def find_opportunity(self):
        """Scan all assets for momentum opportunities"""
        for asset in Config.ASSETS:
            momentum, direction = self.tracker.detect_momentum(asset)
            
            if momentum is None:
                continue
            
            price = self.tracker.last_prices.get(asset, 0)
            
            # Log current state
            dir_arrow = "^" if momentum > 0 else "v" if momentum < 0 else "-"
            logger.info(f"{asset}: ${price:,.2f} | Momentum: {momentum:+.3f}% {dir_arrow}")
            
            # Check if we have a strong enough signal
            if direction and abs(momentum) > Config.MIN_MOMENTUM_PERCENT:
                return {
                    'asset': asset,
                    'direction': direction,
                    'price': price,
                    'momentum': momentum
                }
        
        return None
    
    def execute_trade(self, opportunity):
        """Execute a trade based on the opportunity"""
        logger.info("")
        logger.info("!" * 60)
        logger.info("   OPPORTUNITY DETECTED!")
        logger.info("!" * 60)
        logger.info(f"   Asset: {opportunity['asset']}")
        logger.info(f"   Direction: {opportunity['direction']}")
        logger.info(f"   Price: ${opportunity['price']:,.2f}")
        logger.info(f"   Momentum: {opportunity['momentum']:+.3f}%")
        logger.info(f"   Bet Size: ${self.bet_size}")
        logger.info(f"   Balance: ${self.balance:.2f}")
        logger.info("!" * 60)
        
        if Config.DRY_RUN:
            logger.info("")
            logger.info("   [DRY RUN - No actual trade placed]")
            logger.info("   Set DRY_RUN=false in .env to trade live")
            logger.info("")
        else:
            logger.info("")
            logger.info("   [LIVE MODE - Would place order here]")
            # TODO: Integrate with Polymarket API for actual trading
            logger.info("")
        
        # Record trade
        self.trades.append({
            'time': datetime.now().isoformat(),
            'asset': opportunity['asset'],
            'direction': opportunity['direction'],
            'momentum': opportunity['momentum'],
            'price': opportunity['price'],
            'bet_size': self.bet_size,
            'dry_run': Config.DRY_RUN
        })
        
        self.last_trade_time = time.time()
        return True
    
    def print_status(self):
        """Print current status"""
        win_rate = (self.wins / (self.wins + self.losses) * 100) if (self.wins + self.losses) > 0 else 0
        logger.info("")
        logger.info("-" * 60)
        logger.info(f"   Wallet: ${self.balance:.2f} USDC | Bet: ${self.bet_size}")
        logger.info(f"   Wins: {self.wins} | Losses: {self.losses} | Rate: {win_rate:.1f}%")
        logger.info(f"   Trades: {len(self.trades)}")
        logger.info("-" * 60)
    
    def run(self):
        """Main bot loop"""
        logger.info("Starting bot loop...")
        logger.info(f"Checking every {Config.CHECK_INTERVAL} seconds")
        logger.info("")
        
        balance_check_interval = 60  # Check balance every 60 seconds
        last_balance_check = 0
        
        try:
            while True:
                # Update balance periodically
                if time.time() - last_balance_check > balance_check_interval:
                    self.update_balance()
                    last_balance_check = time.time()
                
                # Check cooldown
                if time.time() - self.last_trade_time < Config.COOLDOWN_AFTER_TRADE and self.last_trade_time > 0:
                    remaining = Config.COOLDOWN_AFTER_TRADE - (time.time() - self.last_trade_time)
                    logger.info(f"Cooldown: {remaining:.0f}s remaining...")
                    time.sleep(Config.CHECK_INTERVAL)
                    continue
                
                # Print status
                self.print_status()
                
                # Scan for opportunities
                logger.info("Scanning for momentum...")
                opportunity = self.find_opportunity()
                
                if opportunity:
                    self.execute_trade(opportunity)
                else:
                    logger.info("No strong momentum detected. Waiting...")
                
                # Wait before next check
                time.sleep(Config.CHECK_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("")
            logger.info("Bot stopped by user")
            self.print_status()
            logger.info("Goodbye!")

# ============= MAIN =============
if __name__ == "__main__":
    print("")
    print("Chainlink Lag Exploit Bot v1.1")
    print("=" * 40)
    
    # Check for .env
    if not os.path.exists('.env'):
        print("")
        print("WARNING: No .env file found!")
        print("")
        print("Create a file called '.env' with:")
        print("  POLYMARKET_PRIVATE_KEY=your_key_here")
        print("  WALLET_ADDRESS=0xYourWalletAddress")
        print("  DRY_RUN=true")
        print("")
    
    # Check for required packages
    try:
        import requests
        from dotenv import load_dotenv
    except ImportError as e:
        print("")
        print(f"ERROR: Missing package - {e}")
        print("")
        print("Run this command to install:")
        print("  pip install requests python-dotenv")
        print("")
        sys.exit(1)
    
    # Optional: eth_account for deriving address from private key
    try:
        from eth_account import Account
        print("eth_account: OK (can derive wallet address)")
    except ImportError:
        print("eth_account: Not installed (add WALLET_ADDRESS to .env manually)")
        print("  To install: pip install eth-account")
    
    print("")
    
    # Start bot
    bot = ChainlinkLagBot()
    bot.run()
