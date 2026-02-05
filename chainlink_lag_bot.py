#!/usr/bin/env python3
"""
Chainlink Lag Exploit Bot v1.0
===============================
Strategy: Exploit the delay between Binance real-time prices and Chainlink oracle updates.
Polymarket uses Chainlink for price resolution - Chainlink updates SLOWER than Binance.

The Play:
1. Watch Binance in real-time
2. See BTC/ETH/SOL moving hard
3. Chainlink hasn't updated yet → Polymarket odds are stale
4. Buy cheap before odds adjust
5. Chainlink catches up → you win
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
    
    # Trading Settings
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    STARTING_CAPITAL = 10      # $10 total
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
        'BTC': {
            'binance_symbol': 'BTCUSDT',
            'chainlink_feed': '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',  # BTC/USD on Ethereum
            'coingecko_id': 'bitcoin'
        },
        'ETH': {
            'binance_symbol': 'ETHUSDT',
            'chainlink_feed': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',  # ETH/USD on Ethereum
            'coingecko_id': 'ethereum'
        },
        'SOL': {
            'binance_symbol': 'SOLUSDT',
            'chainlink_feed': '0x4ffC43a60e009B551865A93d232E33Fce9f01507',  # SOL/USD on Ethereum
            'coingecko_id': 'solana'
        }
    }
    
    # APIs
    BINANCE_API = "https://api.binance.com/api/v3"
    POLYMARKET_API = "https://gamma-api.polymarket.com"

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

# ============= PRICE TRACKER =============
class PriceTracker:
    """Track prices from multiple sources to detect lag"""
    
    def __init__(self):
        self.price_history = {asset: [] for asset in Config.ASSETS}
        self.last_binance = {}
        self.last_chainlink = {}
    
    def get_binance_price(self, symbol):
        """Get real-time price from Binance (fastest source)"""
        try:
            url = f"{Config.BINANCE_API}/ticker/price"
            params = {'symbol': symbol}
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            return float(data['price'])
        except Exception as e:
            logger.error(f"Binance error for {symbol}: {e}")
            return None
    
    def get_chainlink_price(self, asset):
        """
        Get Chainlink oracle price.
        In production, you'd query the actual Chainlink contract.
        For now, we use CoinGecko as a proxy (it's close to Chainlink's update speed).
        """
        try:
            coin_id = Config.ASSETS[asset]['coingecko_id']
            url = f"https://api.coingecko.com/api/v3/simple/price"
            params = {'ids': coin_id, 'vs_currencies': 'usd'}
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            return float(data[coin_id]['usd'])
        except Exception as e:
            logger.error(f"CoinGecko/Chainlink proxy error for {asset}: {e}")
            return None
    
    def detect_lag(self, asset):
        """
        Detect price lag between Binance (fast) and Chainlink (slow).
        Returns: (lag_percent, direction) or (None, None) if no significant lag
        """
        binance_symbol = Config.ASSETS[asset]['binance_symbol']
        
        # Get prices
        binance_price = self.get_binance_price(binance_symbol)
        chainlink_price = self.get_chainlink_price(asset)
        
        if not binance_price or not chainlink_price:
            return None, None
        
        # Store for tracking
        self.last_binance[asset] = binance_price
        self.last_chainlink[asset] = chainlink_price
        
        # Calculate lag percentage
        lag_percent = ((binance_price - chainlink_price) / chainlink_price) * 100
        
        # Store price history for momentum detection
        self.price_history[asset].append({
            'time': time.time(),
            'binance': binance_price,
            'chainlink': chainlink_price,
            'lag': lag_percent
        })
        
        # Keep only last 60 seconds of history
        cutoff = time.time() - 60
        self.price_history[asset] = [
            p for p in self.price_history[asset] if p['time'] > cutoff
        ]
        
        # Determine direction
        if lag_percent > Config.MIN_LAG_PERCENT:
            direction = 'UP'  # Binance higher than Chainlink = price going UP
        elif lag_percent < -Config.MIN_LAG_PERCENT:
            direction = 'DOWN'  # Binance lower than Chainlink = price going DOWN
        else:
            direction = None
        
        return lag_percent, direction
    
    def get_momentum(self, asset):
        """Check if there's strong momentum in the last minute"""
        history = self.price_history[asset]
        if len(history) < 2:
            return 0
        
        oldest = history[0]['binance']
        newest = history[-1]['binance']
        momentum = ((newest - oldest) / oldest) * 100
        return momentum

# ============= BOT =============
class ChainlinkLagBot:
    def __init__(self):
        self.tracker = PriceTracker()
        self.balance = Config.STARTING_CAPITAL
        self.bet_size = Config.BET_SIZE
        self.wins = 0
        self.losses = 0
        self.trades = []
        self.last_trade_time = 0
        
        self.print_banner()
    
    def print_banner(self):
        logger.info("=" * 60)
        logger.info("   CHAINLINK LAG EXPLOIT BOT v1.0")
        logger.info("=" * 60)
        logger.info(f"   Mode: {'DRY RUN (TEST)' if Config.DRY_RUN else 'LIVE TRADING'}")
        logger.info(f"   Capital: ${Config.STARTING_CAPITAL}")
        logger.info(f"   Bet Size: ${Config.BET_SIZE}")
        logger.info(f"   Min Lag Threshold: {Config.MIN_LAG_PERCENT}%")
        logger.info(f"   Assets: {', '.join(Config.ASSETS.keys())}")
        logger.info("=" * 60)
        logger.info("")
        logger.info("   Strategy: Exploit Binance vs Chainlink price lag")
        logger.info("   - Binance updates instantly")
        logger.info("   - Chainlink/Polymarket updates slower")
        logger.info("   - We bet on the direction Chainlink will move")
        logger.info("")
        logger.info("=" * 60)
    
    def find_opportunity(self):
        """Scan all assets for lag opportunities"""
        for asset in Config.ASSETS:
            lag_percent, direction = self.tracker.detect_lag(asset)
            momentum = self.tracker.get_momentum(asset)
            
            if lag_percent is None:
                continue
            
            binance = self.tracker.last_binance.get(asset, 0)
            chainlink = self.tracker.last_chainlink.get(asset, 0)
            
            # Log current state
            logger.info(f"{asset}: Binance=${binance:,.2f} | Chainlink=${chainlink:,.2f} | Lag={lag_percent:+.3f}% | Momentum={momentum:+.3f}%")
            
            # Check if we have an opportunity
            if direction and abs(momentum) > Config.MIN_MOMENTUM_PERCENT:
                return {
                    'asset': asset,
                    'direction': direction,
                    'binance_price': binance,
                    'chainlink_price': chainlink,
                    'lag_percent': lag_percent,
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
        logger.info(f"   Binance: ${opportunity['binance_price']:,.2f}")
        logger.info(f"   Chainlink: ${opportunity['chainlink_price']:,.2f}")
        logger.info(f"   Lag: {opportunity['lag_percent']:+.3f}%")
        logger.info(f"   Momentum: {opportunity['momentum']:+.3f}%")
        logger.info(f"   Bet Size: ${self.bet_size}")
        logger.info("!" * 60)
        
        if Config.DRY_RUN:
            logger.info("")
            logger.info("   [DRY RUN - No actual trade placed]")
            logger.info("   Set DRY_RUN=false in .env to trade live")
            logger.info("")
        else:
            logger.info("")
            logger.info("   [LIVE MODE - Would place order here]")
            logger.info("   Polymarket API integration needed")
            logger.info("")
        
        # Record trade
        self.trades.append({
            'time': datetime.now().isoformat(),
            'asset': opportunity['asset'],
            'direction': opportunity['direction'],
            'lag': opportunity['lag_percent'],
            'bet_size': self.bet_size,
            'dry_run': Config.DRY_RUN
        })
        
        self.last_trade_time = time.time()
        return True
    
    def assess_after_loss(self):
        """Pause and assess after a loss"""
        logger.warning("")
        logger.warning("=" * 60)
        logger.warning("   LOSS DETECTED - ASSESSING STRATEGY")
        logger.warning("=" * 60)
        logger.warning(f"   Total Wins: {self.wins}")
        logger.warning(f"   Total Losses: {self.losses}")
        logger.warning(f"   Win Rate: {self.wins/(self.wins+self.losses)*100:.1f}%" if (self.wins+self.losses) > 0 else "   No trades yet")
        logger.warning("")
        logger.warning("   Pausing for assessment...")
        logger.warning("   Review the logs and market conditions")
        logger.warning("=" * 60)
        time.sleep(Config.COOLDOWN_AFTER_LOSS)
    
    def print_status(self):
        """Print current status"""
        win_rate = (self.wins / (self.wins + self.losses) * 100) if (self.wins + self.losses) > 0 else 0
        logger.info("")
        logger.info("-" * 60)
        logger.info(f"   Balance: ${self.balance:.2f} | Bet: ${self.bet_size}")
        logger.info(f"   Wins: {self.wins} | Losses: {self.losses} | Rate: {win_rate:.1f}%")
        logger.info(f"   Trades Today: {len(self.trades)}")
        logger.info("-" * 60)
    
    def run(self):
        """Main bot loop"""
        logger.info("Starting bot loop...")
        logger.info(f"Checking every {Config.CHECK_INTERVAL} seconds")
        logger.info("")
        
        try:
            while True:
                # Check cooldown
                if time.time() - self.last_trade_time < Config.COOLDOWN_AFTER_TRADE:
                    remaining = Config.COOLDOWN_AFTER_TRADE - (time.time() - self.last_trade_time)
                    logger.info(f"Cooldown: {remaining:.0f}s remaining...")
                    time.sleep(Config.CHECK_INTERVAL)
                    continue
                
                # Print status
                self.print_status()
                
                # Scan for opportunities
                logger.info("Scanning for lag opportunities...")
                opportunity = self.find_opportunity()
                
                if opportunity:
                    self.execute_trade(opportunity)
                else:
                    logger.info("No significant lag detected. Waiting...")
                
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
    print("Chainlink Lag Exploit Bot")
    print("=" * 40)
    
    # Check for .env
    if not os.path.exists('.env'):
        print("")
        print("WARNING: No .env file found!")
        print("")
        print("Create a file called '.env' with:")
        print("  POLYMARKET_PRIVATE_KEY=your_key_here")
        print("  DRY_RUN=true")
        print("")
        print("Starting in DRY RUN mode anyway...")
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
    
    # Start bot
    bot = ChainlinkLagBot()
    bot.run()
