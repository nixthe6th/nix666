#!/usr/bin/env python3
"""
Sharbel's 15-Minute Polymarket Bot v3.1
=======================================
TARGET: BTC/ETH/SOL Up or Down - 15 minute markets

Market Discovery: Uses computed slugs like btc-updown-15m-{timestamp}
where timestamp aligns to 15-minute boundaries.
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

# ============= CONFIGURATION =============
class Config:
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    WALLET_ADDRESS = os.getenv('WALLET_ADDRESS', '')
    
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    BET_SIZE = 1
    
    # Timing - bet 60-90 seconds before close
    BET_WINDOW_START = 90
    BET_WINDOW_END = 30
    
    # Edge requirements
    MIN_PRICE_CHANGE = 0.1   # 0.1% minimum price move
    MAX_ODDS = 0.82
    MIN_ODDS = 0.18
    
    CHECK_INTERVAL = 5
    COOLDOWN = 120
    
    # 15-minute window in seconds
    WINDOW_15M = 900
    
    # Assets and their slug prefixes
    ASSETS = {
        'BTC': {'slug_prefix': 'btc-updown-15m', 'binance': 'BTCUSDT'},
        'ETH': {'slug_prefix': 'eth-updown-15m', 'binance': 'ETHUSDT'},
        'SOL': {'slug_prefix': 'sol-updown-15m', 'binance': 'SOLUSDT'},
    }
    
    BINANCE_API = "https://api.binance.com/api/v3"
    POLYMARKET_API = "https://gamma-api.polymarket.com"
    POLYMARKET_CLOB = "https://clob.polymarket.com"
    POLYGON_RPC = "https://polygon-rpc.com"
    USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

# ============= LOGGING =============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(message)s',
    handlers=[
        logging.FileHandler('polymarket_bot.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ============= HELPERS =============
def get_usdc_balance(wallet_address):
    if not wallet_address:
        return None
    try:
        padded = wallet_address.lower().replace('0x', '').zfill(64)
        payload = {
            "jsonrpc": "2.0", "method": "eth_call",
            "params": [{"to": Config.USDC_CONTRACT, "data": f"0x70a08231{padded}"}, "latest"],
            "id": 1
        }
        r = requests.post(Config.POLYGON_RPC, json=payload, timeout=10)
        result = r.json().get('result', '0x0')
        return int(result, 16) / 1_000_000
    except:
        return None

# ============= MARKET FINDER =============
class MarketFinder:
    """Find active 15-minute Up/Down markets using computed slugs"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        })
    
    def get_current_window_timestamps(self):
        """Get timestamps for current and upcoming 15-min windows"""
        now = int(time.time())
        # Round down to nearest 15-minute boundary
        current_window = (now // Config.WINDOW_15M) * Config.WINDOW_15M
        
        windows = []
        for i in range(4):  # Current and next 3 windows
            ts = current_window + (i * Config.WINDOW_15M)
            # Calculate time until this window closes
            window_end = ts + Config.WINDOW_15M
            seconds_left = window_end - now
            windows.append({
                'timestamp': ts,
                'end_time': window_end,
                'seconds_left': seconds_left
            })
        
        return windows
    
    def find_market_via_slug(self, asset, timestamp):
        """Try to fetch market info using computed slug"""
        slug_prefix = Config.ASSETS[asset]['slug_prefix']
        slug = f"{slug_prefix}-{timestamp}"
        
        try:
            # Try gamma API first
            url = f"{Config.POLYMARKET_API}/events"
            params = {"slug": slug}
            r = self.session.get(url, params=params, timeout=10)
            
            if r.status_code == 200:
                events = r.json()
                if events and len(events) > 0:
                    return self.parse_event(events[0], asset, timestamp)
            
            # Try CLOB API
            url = f"{Config.POLYMARKET_CLOB}/markets/{slug}"
            r = self.session.get(url, timeout=10)
            if r.status_code == 200:
                market = r.json()
                return self.parse_clob_market(market, asset, timestamp)
                
        except Exception as e:
            logger.debug(f"Failed to fetch {slug}: {e}")
        
        return None
    
    def find_market_via_page_scrape(self, asset):
        """Scrape crypto/15M page for market slugs"""
        try:
            url = "https://polymarket.com/crypto/15M"
            r = self.session.get(url, timeout=15)
            r.raise_for_status()
            
            # Find all matching slugs in HTML
            slug_prefix = Config.ASSETS[asset]['slug_prefix']
            pattern = rf"{slug_prefix}-(\d+)"
            matches = re.findall(pattern, r.text)
            
            if matches:
                now = int(time.time())
                # Find the most recent open market
                timestamps = sorted(set(int(ts) for ts in matches), reverse=True)
                
                for ts in timestamps:
                    window_end = ts + Config.WINDOW_15M
                    if now < window_end:  # Market still open
                        seconds_left = window_end - now
                        return {
                            'asset': asset,
                            'slug': f"{slug_prefix}-{ts}",
                            'timestamp': ts,
                            'end_time': window_end,
                            'seconds_left': seconds_left
                        }
            
        except Exception as e:
            logger.debug(f"Page scrape failed: {e}")
        
        return None
    
    def parse_event(self, event, asset, timestamp):
        """Parse event data"""
        try:
            markets = event.get('markets', [])
            if not markets:
                return None
            
            market = markets[0]
            
            # Get prices
            prices_str = market.get('outcomePrices', '["0.5", "0.5"]')
            try:
                prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
                up_price = float(prices[0])
                down_price = float(prices[1]) if len(prices) > 1 else 1 - up_price
            except:
                up_price, down_price = 0.5, 0.5
            
            now = int(time.time())
            window_end = timestamp + Config.WINDOW_15M
            
            return {
                'asset': asset,
                'slug': f"{Config.ASSETS[asset]['slug_prefix']}-{timestamp}",
                'timestamp': timestamp,
                'end_time': window_end,
                'seconds_left': window_end - now,
                'up_price': up_price,
                'down_price': down_price,
                'condition_id': market.get('conditionId'),
                'token_ids': market.get('clobTokenIds', [])
            }
        except:
            return None
    
    def parse_clob_market(self, market, asset, timestamp):
        """Parse CLOB market data"""
        now = int(time.time())
        window_end = timestamp + Config.WINDOW_15M
        
        return {
            'asset': asset,
            'slug': f"{Config.ASSETS[asset]['slug_prefix']}-{timestamp}",
            'timestamp': timestamp,
            'end_time': window_end,
            'seconds_left': window_end - now,
            'up_price': 0.5,  # Would need order book for actual prices
            'down_price': 0.5,
            'condition_id': market.get('condition_id'),
            'token_ids': market.get('tokens', [])
        }
    
    def find_all_active_markets(self):
        """Find all currently active 15-min markets"""
        markets = []
        windows = self.get_current_window_timestamps()
        
        for asset in Config.ASSETS:
            # Try computed slugs first
            for window in windows:
                if window['seconds_left'] > 0:  # Only open markets
                    market = self.find_market_via_slug(asset, window['timestamp'])
                    if market:
                        markets.append(market)
                        break
            
            # Fallback to page scrape
            if not any(m['asset'] == asset for m in markets):
                market = self.find_market_via_page_scrape(asset)
                if market:
                    markets.append(market)
        
        return markets

# ============= BINANCE TRACKER =============
class BinanceTracker:
    def __init__(self):
        self.cache = {}
        self.cache_time = {}
    
    def get_price(self, asset):
        if asset in self.cache and time.time() - self.cache_time.get(asset, 0) < 2:
            return self.cache[asset]
        
        try:
            symbol = Config.ASSETS.get(asset, {}).get('binance')
            if not symbol:
                return None
            r = requests.get(f"{Config.BINANCE_API}/ticker/price", 
                           params={'symbol': symbol}, timeout=5)
            price = float(r.json()['price'])
            self.cache[asset] = price
            self.cache_time[asset] = time.time()
            return price
        except:
            return None
    
    def get_15min_change(self, asset):
        """Get price change in current 15-min window"""
        try:
            symbol = Config.ASSETS.get(asset, {}).get('binance')
            if not symbol:
                return None, None
            
            r = requests.get(f"{Config.BINANCE_API}/klines",
                           params={'symbol': symbol, 'interval': '15m', 'limit': 2},
                           timeout=5)
            klines = r.json()
            
            if len(klines) < 2:
                return None, None
            
            current = klines[-1]
            open_price = float(current[1])
            current_price = float(current[4])
            
            change = ((current_price - open_price) / open_price) * 100
            return change, open_price
        except:
            return None, None

# ============= BOT =============
class SharbelsBot:
    def __init__(self):
        self.finder = MarketFinder()
        self.binance = BinanceTracker()
        self.wallet = Config.WALLET_ADDRESS
        self.balance = get_usdc_balance(self.wallet) or 0
        self.trades = []
        self.last_trade = 0
        
        self.print_banner()
    
    def print_banner(self):
        logger.info("")
        logger.info("=" * 70)
        logger.info("   SHARBEL'S POLYMARKET BOT v3.1")
        logger.info("   15-Minute Up/Down Crypto Markets")
        logger.info("=" * 70)
        logger.info(f"   Mode: {'DRY RUN' if Config.DRY_RUN else '*** LIVE ***'}")
        logger.info(f"   Wallet: {self.wallet[:12]}...{self.wallet[-6:]}" if self.wallet else "   Wallet: Not set")
        logger.info(f"   Balance: ${self.balance:.2f} USDC")
        logger.info(f"   Bet Size: ${Config.BET_SIZE}")
        logger.info("=" * 70)
        logger.info("")
        logger.info("   STRATEGY:")
        logger.info("   1. Find BTC/ETH/SOL 15-min Up/Down markets")
        logger.info("   2. Wait until 60-90 seconds before close")
        logger.info("   3. Check if price went UP or DOWN this window")
        logger.info("   4. Bet on the current direction")
        logger.info("")
        logger.info("=" * 70)
    
    def scan(self):
        """Scan for markets"""
        logger.info("Finding active 15-min markets...")
        markets = self.finder.find_all_active_markets()
        
        if not markets:
            logger.info("  No markets found via API - trying page scrape...")
            # Force page scrape for all assets
            for asset in Config.ASSETS:
                market = self.finder.find_market_via_page_scrape(asset)
                if market:
                    markets.append(market)
        
        ready = []
        
        for m in markets:
            secs = m.get('seconds_left', 0)
            asset = m['asset']
            
            # Get price change
            change, open_price = self.binance.get_15min_change(asset)
            current_price = self.binance.get_price(asset)
            
            # Status
            if secs <= 0:
                status = "CLOSED"
            elif secs < Config.BET_WINDOW_END:
                status = "TOO LATE"
            elif secs <= Config.BET_WINDOW_START:
                status = ">>> READY <<<"
                # Add price data
                m['change'] = change
                m['open_price'] = open_price
                m['current_price'] = current_price
                ready.append(m)
            else:
                mins = int(secs // 60)
                secs_rem = int(secs % 60)
                status = f"{mins}m {secs_rem}s"
            
            direction = "UP" if change and change > 0 else "DOWN" if change and change < 0 else "?"
            change_str = f"{change:+.2f}%" if change else "N/A"
            
            logger.info(f"  {asset}: {direction} {change_str} | [{status}]")
        
        return ready
    
    def analyze(self, market):
        """Decide to bet UP or DOWN"""
        asset = market['asset']
        change = market.get('change')
        current_price = market.get('current_price')
        open_price = market.get('open_price')
        up_price = market.get('up_price', 0.5)
        down_price = market.get('down_price', 0.5)
        
        if change is None:
            return None
        
        # Determine bet based on price direction
        if change > Config.MIN_PRICE_CHANGE:
            side = 'UP'
            price = up_price
        elif change < -Config.MIN_PRICE_CHANGE:
            side = 'DOWN'
            price = down_price
        else:
            logger.info(f"  {asset} is flat ({change:+.2f}%) - skipping")
            return None
        
        # Check odds
        if price > Config.MAX_ODDS:
            logger.info(f"  {side} odds too high ({price:.0%})")
            return None
        if price < Config.MIN_ODDS:
            logger.info(f"  {side} odds too low ({price:.0%})")
            return None
        
        profit = (Config.BET_SIZE / price) - Config.BET_SIZE
        
        return {
            'market': market,
            'asset': asset,
            'side': side,
            'odds': price,
            'change': change,
            'open_price': open_price,
            'current_price': current_price,
            'potential_profit': profit,
            'seconds_left': market['seconds_left']
        }
    
    def execute(self, bet):
        """Execute bet"""
        logger.info("")
        logger.info("*" * 70)
        logger.info("   $$$ PLACING BET $$$")
        logger.info("*" * 70)
        logger.info(f"   {bet['asset']}: ${bet['open_price']:,.2f} -> ${bet['current_price']:,.2f}")
        logger.info(f"   Change: {bet['change']:+.2f}%")
        logger.info(f"   Time Left: {bet['seconds_left']:.0f}s")
        logger.info("")
        logger.info(f"   >>> BET: {bet['side']} @ {bet['odds']:.0%} <<<")
        logger.info(f"   Bet: ${Config.BET_SIZE} | Potential Win: ${Config.BET_SIZE/bet['odds']:.2f}")
        logger.info("*" * 70)
        
        if Config.DRY_RUN:
            logger.info("   [DRY RUN - Not executed]")
        else:
            logger.info("   [LIVE] Would place order...")
        
        self.trades.append({
            'time': datetime.now().isoformat(),
            'asset': bet['asset'],
            'side': bet['side'],
            'odds': bet['odds'],
            'change': bet['change']
        })
        
        self.last_trade = time.time()
    
    def run(self):
        """Main loop"""
        logger.info("Starting bot...")
        
        try:
            while True:
                # Cooldown
                if self.last_trade > 0 and time.time() - self.last_trade < Config.COOLDOWN:
                    remaining = Config.COOLDOWN - (time.time() - self.last_trade)
                    logger.info(f"Cooldown: {remaining:.0f}s")
                    time.sleep(Config.CHECK_INTERVAL)
                    continue
                
                logger.info("-" * 70)
                
                ready = self.scan()
                
                if not ready:
                    logger.info("No markets in betting window")
                else:
                    for market in ready:
                        logger.info(f"\nAnalyzing {market['asset']}...")
                        bet = self.analyze(market)
                        if bet:
                            self.execute(bet)
                            break
                
                time.sleep(Config.CHECK_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("\nBot stopped")
            logger.info(f"Total trades: {len(self.trades)}")

# ============= MAIN =============
if __name__ == "__main__":
    print("\nSharbel's Polymarket Bot v3.1")
    print("=" * 40)
    
    try:
        import requests
        from dotenv import load_dotenv
    except ImportError as e:
        print(f"Missing: {e}")
        print("Run: pip install requests python-dotenv")
        sys.exit(1)
    
    if not os.path.exists('.env'):
        print("Create .env with:")
        print("  WALLET_ADDRESS=0x...")
        print("  DRY_RUN=true")
    
    print()
    bot = SharbelsBot()
    bot.run()
