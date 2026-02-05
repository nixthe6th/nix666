#!/usr/bin/env python3
"""
SHARBEL'S POLYMARKET BOT v4.0
=============================
Based on actual strategy from Sharbel's video transcript.

THE STRATEGY:
1. At START of 15-min window → record opening price
2. Wait until LAST 30 SECONDS before close
3. Compare current Binance price vs opening price
4. If price went UP → bet UP
5. If price went DOWN → bet DOWN
6. With only 30s left, price unlikely to reverse = easy win

THE EDGE:
- Polymarket resolves based on Chainlink price feed
- Chainlink updates SLOWER than Binance
- You can see where price IS before Chainlink/odds catch up
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

load_dotenv()

# ============= CONFIG =============
class Config:
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    WALLET_ADDRESS = os.getenv('WALLET_ADDRESS', '')
    
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    BET_SIZE = float(os.getenv('BET_SIZE', '1'))
    
    # SHARBEL'S TIMING: Snipe in last 30 seconds!
    SNIPE_WINDOW_START = 60   # Start watching at 60s left
    SNIPE_WINDOW_END = 15     # Must bet by 15s left (order needs time)
    OPTIMAL_SNIPE = 30        # Ideal: 30 seconds before close
    
    # 15-minute window
    WINDOW_15M = 900  # 15 * 60 seconds
    
    # Minimum price movement to bet (avoid flat markets)
    MIN_PRICE_MOVE_PERCENT = 0.1  # 0.1% minimum
    
    CHECK_INTERVAL = 5
    COOLDOWN = 120
    
    # Assets
    ASSETS = {
        'BTC': {'slug': 'btc-updown-15m', 'binance': 'BTCUSDT'},
        'ETH': {'slug': 'eth-updown-15m', 'binance': 'ETHUSDT'},
        'SOL': {'slug': 'sol-updown-15m', 'binance': 'SOLUSDT'},
    }
    
    BINANCE_API = "https://api.binance.com/api/v3"
    POLYMARKET_API = "https://gamma-api.polymarket.com"
    POLYGON_RPC = "https://polygon-rpc.com"
    USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

# ============= LOGGING =============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(message)s',
    handlers=[
        logging.FileHandler('sharbel_bot.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger(__name__)

# ============= HELPERS =============
def get_balance(wallet):
    if not wallet:
        return 0
    try:
        padded = wallet.lower().replace('0x', '').zfill(64)
        r = requests.post(Config.POLYGON_RPC, json={
            "jsonrpc": "2.0", "method": "eth_call",
            "params": [{"to": Config.USDC_CONTRACT, "data": f"0x70a08231{padded}"}, "latest"],
            "id": 1
        }, timeout=10)
        return int(r.json().get('result', '0x0'), 16) / 1_000_000
    except:
        return 0

def get_binance_price(symbol):
    """Get real-time price from Binance"""
    try:
        r = requests.get(f"{Config.BINANCE_API}/ticker/price", 
                        params={'symbol': symbol}, timeout=5)
        return float(r.json()['price'])
    except:
        return None

# ============= WINDOW TRACKER =============
class WindowTracker:
    """
    Track 15-minute windows and their opening prices.
    This is KEY to Sharbel's strategy!
    """
    
    def __init__(self):
        # Store opening prices for each window
        # Key: window_start_timestamp, Value: {asset: price}
        self.window_prices = {}
    
    def get_current_window(self):
        """Get the current 15-min window timestamps"""
        now = int(time.time())
        window_start = (now // Config.WINDOW_15M) * Config.WINDOW_15M
        window_end = window_start + Config.WINDOW_15M
        seconds_left = window_end - now
        
        return {
            'start': window_start,
            'end': window_end,
            'seconds_left': seconds_left,
            'seconds_elapsed': now - window_start
        }
    
    def record_opening_price(self, window_start, asset, price):
        """Record the opening price for a window"""
        if window_start not in self.window_prices:
            self.window_prices[window_start] = {}
        
        # Only record if we don't have it yet (first price of the window)
        if asset not in self.window_prices[window_start]:
            self.window_prices[window_start][asset] = price
            log.info(f"  Recorded {asset} opening price: ${price:,.2f}")
    
    def get_opening_price(self, window_start, asset):
        """Get the opening price for a window"""
        return self.window_prices.get(window_start, {}).get(asset)
    
    def cleanup_old_windows(self):
        """Remove old window data to save memory"""
        now = int(time.time())
        cutoff = now - (Config.WINDOW_15M * 3)  # Keep last 3 windows
        
        old_windows = [w for w in self.window_prices if w < cutoff]
        for w in old_windows:
            del self.window_prices[w]

# ============= MARKET FINDER =============
class MarketFinder:
    """Find active 15-min markets via page scraping"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        })
    
    def find_markets(self):
        """Scrape polymarket.com/crypto/15M for active markets"""
        markets = []
        
        try:
            r = self.session.get("https://polymarket.com/crypto/15M", timeout=15)
            r.raise_for_status()
            html = r.text
            
            now = int(time.time())
            
            for asset, config in Config.ASSETS.items():
                slug_prefix = config['slug']
                
                # Find all timestamps for this asset
                pattern = rf"{slug_prefix}-(\d+)"
                matches = re.findall(pattern, html)
                
                if matches:
                    # Get the most recent open market
                    for ts_str in sorted(set(matches), reverse=True):
                        ts = int(ts_str)
                        window_end = ts + Config.WINDOW_15M
                        
                        if now < window_end:  # Still open
                            seconds_left = window_end - now
                            markets.append({
                                'asset': asset,
                                'slug': f"{slug_prefix}-{ts}",
                                'window_start': ts,
                                'window_end': window_end,
                                'seconds_left': seconds_left
                            })
                            break
            
            return markets
            
        except Exception as e:
            log.error(f"Error finding markets: {e}")
            return []

# ============= MAIN BOT =============
class SharbelsBot:
    def __init__(self):
        self.tracker = WindowTracker()
        self.finder = MarketFinder()
        self.wallet = Config.WALLET_ADDRESS
        self.balance = get_balance(self.wallet)
        self.trades = []
        self.last_trade = 0
        self.wins = 0
        self.losses = 0
        
        self.print_banner()
    
    def print_banner(self):
        log.info("")
        log.info("=" * 70)
        log.info("   SHARBEL'S POLYMARKET BOT v4.0")
        log.info("   Strategy: Snipe in LAST 30 SECONDS of 15-min window")
        log.info("=" * 70)
        log.info(f"   Mode: {'DRY RUN' if Config.DRY_RUN else '*** LIVE TRADING ***'}")
        log.info(f"   Wallet: {self.wallet[:12]}...{self.wallet[-6:]}" if self.wallet else "   Wallet: Not set")
        log.info(f"   Balance: ${self.balance:.2f} USDC")
        log.info(f"   Bet Size: ${Config.BET_SIZE}")
        log.info("=" * 70)
        log.info("")
        log.info("   THE STRATEGY:")
        log.info("   1. Record price at START of 15-min window")
        log.info("   2. Wait until LAST 30 SECONDS")
        log.info("   3. Compare current price vs opening price")
        log.info("   4. Bet UP if price went up, DOWN if price went down")
        log.info("   5. With 30s left, price unlikely to reverse = WIN")
        log.info("")
        log.info("   THE EDGE:")
        log.info("   Polymarket uses Chainlink (slow) - we use Binance (fast)")
        log.info("   We see where price IS before odds adjust")
        log.info("")
        log.info("=" * 70)
    
    def run(self):
        """Main loop"""
        log.info("")
        log.info("Starting bot... watching for snipe opportunities")
        log.info("")
        
        try:
            while True:
                self.tick()
                time.sleep(Config.CHECK_INTERVAL)
                
        except KeyboardInterrupt:
            log.info("")
            log.info("=" * 70)
            log.info("Bot stopped")
            log.info(f"Trades: {len(self.trades)} | Wins: {self.wins} | Losses: {self.losses}")
            log.info("=" * 70)
    
    def tick(self):
        """One iteration of the main loop"""
        
        # Cleanup old data
        self.tracker.cleanup_old_windows()
        
        # Get current window info
        window = self.tracker.get_current_window()
        secs_left = window['seconds_left']
        secs_elapsed = window['seconds_elapsed']
        
        log.info("-" * 70)
        mins = int(secs_left // 60)
        secs = int(secs_left % 60)
        log.info(f"Window closes in: {mins}m {secs}s")
        
        # Record opening prices if we're early in the window
        if secs_elapsed < 30:
            log.info("Window just started - recording opening prices...")
            for asset, config in Config.ASSETS.items():
                price = get_binance_price(config['binance'])
                if price:
                    self.tracker.record_opening_price(window['start'], asset, price)
        
        # Check if we're in the snipe window
        in_snipe_window = Config.SNIPE_WINDOW_END < secs_left <= Config.SNIPE_WINDOW_START
        
        if not in_snipe_window:
            if secs_left > Config.SNIPE_WINDOW_START:
                log.info(f"Waiting for snipe window... ({secs_left - Config.SNIPE_WINDOW_START:.0f}s)")
            elif secs_left <= Config.SNIPE_WINDOW_END:
                log.info("Too late to snipe this window")
            return
        
        # We're in the snipe window!
        log.info("")
        log.info(">>> IN SNIPE WINDOW <<<")
        log.info("")
        
        # Cooldown check
        if self.last_trade > 0 and time.time() - self.last_trade < Config.COOLDOWN:
            log.info(f"Cooldown active ({Config.COOLDOWN - (time.time() - self.last_trade):.0f}s left)")
            return
        
        # Find markets and analyze
        markets = self.finder.find_markets()
        
        if not markets:
            log.info("No markets found - trying direct calculation...")
            # Fallback: use calculated window
            for asset in Config.ASSETS:
                markets.append({
                    'asset': asset,
                    'window_start': window['start'],
                    'seconds_left': secs_left
                })
        
        # Analyze each asset
        for market in markets:
            asset = market['asset']
            window_start = market.get('window_start', window['start'])
            
            # Get opening and current prices
            open_price = self.tracker.get_opening_price(window_start, asset)
            current_price = get_binance_price(Config.ASSETS[asset]['binance'])
            
            if not open_price:
                log.info(f"  {asset}: No opening price recorded - skipping")
                continue
            
            if not current_price:
                log.info(f"  {asset}: Could not get current price - skipping")
                continue
            
            # Calculate price change
            change_percent = ((current_price - open_price) / open_price) * 100
            
            # Determine direction
            if change_percent > 0:
                direction = "UP"
                arrow = "↑"
            elif change_percent < 0:
                direction = "DOWN"
                arrow = "↓"
            else:
                direction = "FLAT"
                arrow = "→"
            
            log.info(f"  {asset}: ${open_price:,.2f} → ${current_price:,.2f} ({change_percent:+.2f}%) {arrow}")
            
            # Check if move is significant enough
            if abs(change_percent) < Config.MIN_PRICE_MOVE_PERCENT:
                log.info(f"    Move too small ({abs(change_percent):.2f}% < {Config.MIN_PRICE_MOVE_PERCENT}%) - skipping")
                continue
            
            # WE HAVE A TRADE!
            self.execute_snipe(asset, direction, open_price, current_price, change_percent, secs_left)
            return  # One trade per tick
    
    def execute_snipe(self, asset, direction, open_price, current_price, change_percent, secs_left):
        """Execute the snipe trade"""
        log.info("")
        log.info("*" * 70)
        log.info("   $$$ SNIPING! $$$")
        log.info("*" * 70)
        log.info(f"   Asset: {asset}")
        log.info(f"   Open Price: ${open_price:,.2f}")
        log.info(f"   Current Price: ${current_price:,.2f}")
        log.info(f"   Change: {change_percent:+.2f}%")
        log.info(f"   Time Left: {secs_left:.0f} seconds")
        log.info("")
        log.info(f"   >>> BETTING: {direction} <<<")
        log.info(f"   Bet Size: ${Config.BET_SIZE}")
        log.info("*" * 70)
        
        if Config.DRY_RUN:
            log.info("")
            log.info("   [DRY RUN - Trade logged but NOT placed]")
            log.info("   Set DRY_RUN=false in .env to trade for real")
        else:
            log.info("")
            log.info("   [LIVE MODE] Would place order via Polymarket CLOB API...")
            # TODO: Implement actual order placement
        
        log.info("")
        
        # Record trade
        self.trades.append({
            'time': datetime.now().isoformat(),
            'asset': asset,
            'direction': direction,
            'open_price': open_price,
            'current_price': current_price,
            'change': change_percent,
            'seconds_left': secs_left,
            'bet_size': Config.BET_SIZE,
            'dry_run': Config.DRY_RUN
        })
        
        self.last_trade = time.time()
        
        log.info(f"Trade #{len(self.trades)} recorded")
        log.info("")

# ============= MAIN =============
if __name__ == "__main__":
    print("")
    print("=" * 50)
    print("  SHARBEL'S POLYMARKET BOT v4.0")
    print("  Snipe Strategy: Last 30 seconds")
    print("=" * 50)
    print("")
    
    # Check packages
    try:
        import requests
        from dotenv import load_dotenv
    except ImportError as e:
        print(f"Missing package: {e}")
        print("Run: pip install requests python-dotenv")
        sys.exit(1)
    
    # Check .env
    if not os.path.exists('.env'):
        print("No .env file found!")
        print("")
        print("Create .env with:")
        print("  WALLET_ADDRESS=0x...")
        print("  DRY_RUN=true")
        print("  BET_SIZE=1")
        print("")
    
    # Run bot
    bot = SharbelsBot()
    bot.run()
