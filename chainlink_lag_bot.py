#!/usr/bin/env python3
"""
Sharbel's 15-Minute Polymarket Bot v3.0
=======================================
TARGET: Bitcoin/ETH/SOL Up or Down - 15 minute markets

Strategy:
1. Monitor the 15-minute "Up or Down" crypto markets
2. Wait until ~60 seconds before market closes
3. Check Binance price vs. the opening price
4. Bet on UP if price is higher, DOWN if lower
5. With only 60 seconds left, price won't move much = easy win
"""

import os
import sys
import time
import json
import logging
import requests
import re
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

# ============= CONFIGURATION =============
class Config:
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    WALLET_ADDRESS = os.getenv('WALLET_ADDRESS', '')
    
    # Trading
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    BET_SIZE = 1
    MAX_BET_SIZE = 2
    
    # SHARBEL'S TIMING - Bet 60-90 seconds before close
    BET_WINDOW_START = 90    # Start looking when 90 seconds left
    BET_WINDOW_END = 30      # Stop betting when only 30 seconds left
    
    # Edge Requirements
    MIN_PRICE_CHANGE = 0.1   # Price must have moved 0.1% to bet
    MAX_ODDS_TO_BUY = 0.82   # Don't buy if odds > 82%
    MIN_ODDS_TO_BUY = 0.18   # Don't buy if odds < 18%
    
    # Timing
    CHECK_INTERVAL = 5
    COOLDOWN_AFTER_TRADE = 120
    
    # Target Markets - The 15-min Up/Down markets
    MARKETS = {
        'BTC': {'slug': 'btc-updown-15m', 'binance': 'BTCUSDT'},
        'ETH': {'slug': 'eth-updown-15m', 'binance': 'ETHUSDT'},
        'SOL': {'slug': 'sol-updown-15m', 'binance': 'SOLUSDT'},
        'XRP': {'slug': 'xrp-updown-15m', 'binance': 'XRPUSDT'},
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

# ============= POLYMARKET CLIENT =============
class PolymarketClient:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        })
    
    def get_15min_markets(self):
        """Fetch current 15-minute Up/Down markets"""
        markets = []
        
        try:
            # Get all events
            url = f"{Config.POLYMARKET_API}/events"
            params = {"active": "true", "closed": "false", "limit": 100}
            r = self.session.get(url, params=params, timeout=15)
            r.raise_for_status()
            events = r.json()
            
            for event in events:
                slug = event.get('slug', '')
                title = event.get('title', '')
                
                # Check if it's a 15-min up/down market
                for asset, config in Config.MARKETS.items():
                    if config['slug'] in slug or (asset.lower() in title.lower() and '15' in title and 'up' in title.lower()):
                        market_data = self.parse_event(event, asset)
                        if market_data:
                            markets.append(market_data)
                        break
            
            return markets
            
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []
    
    def parse_event(self, event, asset):
        """Parse event data into market info"""
        try:
            # Get market details
            markets = event.get('markets', [])
            if not markets:
                return None
            
            market = markets[0]  # Usually one market per event
            
            # Get end time
            end_date = event.get('endDate') or market.get('endDate')
            if not end_date:
                return None
            
            # Parse end time
            try:
                if 'T' in end_date:
                    end_time = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                else:
                    end_time = datetime.fromtimestamp(int(end_date), tz=timezone.utc)
            except:
                return None
            
            # Calculate time remaining
            now = datetime.now(timezone.utc)
            seconds_left = (end_time - now).total_seconds()
            
            # Get odds
            outcomes = market.get('outcomes', ['Up', 'Down'])
            prices_str = market.get('outcomePrices', '["0.5", "0.5"]')
            try:
                prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
                up_price = float(prices[0]) if prices else 0.5
                down_price = float(prices[1]) if len(prices) > 1 else 1 - up_price
            except:
                up_price, down_price = 0.5, 0.5
            
            # Get token IDs for trading
            token_ids = market.get('clobTokenIds', [])
            
            return {
                'asset': asset,
                'event_id': event.get('id'),
                'market_id': market.get('id'),
                'condition_id': market.get('conditionId'),
                'title': event.get('title', ''),
                'end_time': end_time,
                'seconds_left': seconds_left,
                'up_price': up_price,
                'down_price': down_price,
                'token_ids': token_ids,
                'outcomes': outcomes
            }
            
        except Exception as e:
            logger.error(f"Error parsing event: {e}")
            return None

# ============= BINANCE PRICE TRACKER =============
class BinanceTracker:
    def __init__(self):
        self.cache = {}
        self.cache_time = {}
        self.opening_prices = {}  # Track opening price for each market
    
    def get_price(self, asset):
        """Get current price from Binance"""
        if asset in self.cache and time.time() - self.cache_time.get(asset, 0) < 2:
            return self.cache[asset]
        
        try:
            symbol = Config.MARKETS.get(asset, {}).get('binance')
            if not symbol:
                return None
            
            r = requests.get(f"{Config.BINANCE_API}/ticker/price", 
                           params={'symbol': symbol}, timeout=5)
            price = float(r.json()['price'])
            
            self.cache[asset] = price
            self.cache_time[asset] = time.time()
            return price
        except Exception as e:
            logger.error(f"Binance error for {asset}: {e}")
            return None
    
    def get_price_change_15min(self, asset):
        """Get price change over last 15 minutes"""
        try:
            symbol = Config.MARKETS.get(asset, {}).get('binance')
            if not symbol:
                return None, None
            
            # Get klines for last 15 minutes
            r = requests.get(f"{Config.BINANCE_API}/klines",
                           params={'symbol': symbol, 'interval': '15m', 'limit': 2},
                           timeout=5)
            klines = r.json()
            
            if len(klines) < 2:
                return None, None
            
            # Current 15-min candle
            current = klines[-1]
            open_price = float(current[1])
            current_price = float(current[4])  # Close/current
            
            change_percent = ((current_price - open_price) / open_price) * 100
            
            return change_percent, open_price
            
        except Exception as e:
            logger.error(f"Error getting 15min change for {asset}: {e}")
            return None, None

# ============= MAIN BOT =============
class SharbelsBot:
    def __init__(self):
        self.polymarket = PolymarketClient()
        self.binance = BinanceTracker()
        self.wallet = Config.WALLET_ADDRESS
        self.balance = get_usdc_balance(self.wallet) or 0
        self.trades = []
        self.last_trade = 0
        
        self.print_banner()
    
    def print_banner(self):
        logger.info("")
        logger.info("=" * 70)
        logger.info("   SHARBEL'S POLYMARKET BOT v3.0")
        logger.info("   Target: 15-Minute Up/Down Crypto Markets")
        logger.info("=" * 70)
        logger.info(f"   Mode: {'DRY RUN (TEST)' if Config.DRY_RUN else '*** LIVE TRADING ***'}")
        logger.info(f"   Wallet: {self.wallet[:12]}...{self.wallet[-6:]}" if self.wallet else "   Wallet: Not configured")
        logger.info(f"   Balance: ${self.balance:.2f} USDC")
        logger.info(f"   Bet Size: ${Config.BET_SIZE}")
        logger.info(f"   Bet Window: {Config.BET_WINDOW_START}s to {Config.BET_WINDOW_END}s before close")
        logger.info("=" * 70)
        logger.info("")
        logger.info("   STRATEGY:")
        logger.info("   1. Find 15-min 'Up or Down' markets (BTC, ETH, SOL, XRP)")
        logger.info("   2. Wait until 60-90 seconds before market closes")
        logger.info("   3. Check if price went UP or DOWN since market opened")
        logger.info("   4. Bet on the current direction (momentum)")
        logger.info("   5. With only 60s left, direction likely won't reverse")
        logger.info("")
        logger.info("=" * 70)
        logger.info("")
    
    def scan_markets(self):
        """Scan for markets in the betting window"""
        markets = self.polymarket.get_15min_markets()
        ready_markets = []
        
        logger.info(f"Found {len(markets)} active 15-min markets:")
        
        for m in markets:
            secs = m['seconds_left']
            asset = m['asset']
            
            # Get current price info
            current_price = self.binance.get_price(asset)
            change, open_price = self.binance.get_price_change_15min(asset)
            
            # Status message
            if secs <= 0:
                status = "CLOSED"
            elif secs < Config.BET_WINDOW_END:
                status = "TOO LATE"
            elif secs <= Config.BET_WINDOW_START:
                status = ">>> READY <<<"
                ready_markets.append(m)
            else:
                mins = int(secs // 60)
                secs_rem = int(secs % 60)
                status = f"{mins}m {secs_rem}s left"
            
            # Price direction
            direction = "UP" if change and change > 0 else "DOWN" if change and change < 0 else "FLAT"
            
            logger.info(f"  {asset}: Up={m['up_price']:.0%} Down={m['down_price']:.0%} | Price {direction} {abs(change or 0):.2f}% | [{status}]")
        
        return ready_markets
    
    def analyze_bet(self, market):
        """Decide whether to bet UP or DOWN"""
        asset = market['asset']
        up_price = market['up_price']
        down_price = market['down_price']
        
        # Get price change since market opened
        change_percent, open_price = self.binance.get_price_change_15min(asset)
        current_price = self.binance.get_price(asset)
        
        if change_percent is None or current_price is None:
            logger.info(f"  Could not get price data for {asset}")
            return None
        
        # Determine bet direction based on price movement
        if change_percent > Config.MIN_PRICE_CHANGE:
            # Price went UP - bet on UP
            bet_side = 'UP'
            bet_price = up_price
            confidence = "HIGH" if change_percent > 0.3 else "MEDIUM"
        elif change_percent < -Config.MIN_PRICE_CHANGE:
            # Price went DOWN - bet on DOWN
            bet_side = 'DOWN'
            bet_price = down_price
            confidence = "HIGH" if change_percent < -0.3 else "MEDIUM"
        else:
            # Price is flat - too risky
            logger.info(f"  {asset} price is flat ({change_percent:+.2f}%) - skipping")
            return None
        
        # Check if odds are worth it
        if bet_price > Config.MAX_ODDS_TO_BUY:
            logger.info(f"  {bet_side} odds too high ({bet_price:.0%}) - market already priced in")
            return None
        
        if bet_price < Config.MIN_ODDS_TO_BUY:
            logger.info(f"  {bet_side} odds suspiciously low ({bet_price:.0%}) - possible trap")
            return None
        
        # Calculate potential profit
        # If we bet $1 at 0.60 and win, we get $1/$0.60 = $1.67
        potential_return = Config.BET_SIZE / bet_price
        potential_profit = potential_return - Config.BET_SIZE
        
        return {
            'market': market,
            'asset': asset,
            'bet_side': bet_side,
            'bet_price': bet_price,
            'current_price': current_price,
            'open_price': open_price,
            'change_percent': change_percent,
            'confidence': confidence,
            'potential_profit': potential_profit,
            'seconds_left': market['seconds_left']
        }
    
    def execute_bet(self, bet):
        """Execute the bet"""
        logger.info("")
        logger.info("*" * 70)
        logger.info("   $$$ OPPORTUNITY FOUND - PLACING BET $$$")
        logger.info("*" * 70)
        logger.info(f"   Market: {bet['market']['title']}")
        logger.info(f"   Time Left: {bet['seconds_left']:.0f} seconds")
        logger.info("")
        logger.info(f"   {bet['asset']} Open Price:    ${bet['open_price']:,.2f}")
        logger.info(f"   {bet['asset']} Current Price: ${bet['current_price']:,.2f}")
        logger.info(f"   Price Change: {bet['change_percent']:+.2f}%")
        logger.info(f"   Confidence: {bet['confidence']}")
        logger.info("")
        logger.info(f"   >>> BETTING: {bet['bet_side']} @ {bet['bet_price']:.0%} <<<")
        logger.info(f"   Bet Size: ${Config.BET_SIZE:.2f}")
        logger.info(f"   If Win: ${Config.BET_SIZE / bet['bet_price']:.2f} (profit: ${bet['potential_profit']:.2f})")
        logger.info("*" * 70)
        
        if Config.DRY_RUN:
            logger.info("")
            logger.info("   [DRY RUN - Bet recorded but NOT placed]")
            logger.info("   Set DRY_RUN=false in .env to trade for real")
        else:
            logger.info("")
            logger.info("   [LIVE MODE] Attempting to place order...")
            # TODO: Implement actual CLOB order placement
            # Requires: py-clob-client or direct API with signed transactions
            logger.info("   Order placement requires CLOB API integration")
        
        logger.info("")
        
        # Record trade
        self.trades.append({
            'time': datetime.now().isoformat(),
            'asset': bet['asset'],
            'side': bet['bet_side'],
            'price': bet['bet_price'],
            'change': bet['change_percent'],
            'bet_size': Config.BET_SIZE,
            'dry_run': Config.DRY_RUN
        })
        
        self.last_trade = time.time()
    
    def run(self):
        """Main loop"""
        logger.info("Starting bot... checking every 5 seconds")
        logger.info("")
        
        try:
            while True:
                # Cooldown check
                if self.last_trade > 0:
                    elapsed = time.time() - self.last_trade
                    if elapsed < Config.COOLDOWN_AFTER_TRADE:
                        remaining = Config.COOLDOWN_AFTER_TRADE - elapsed
                        logger.info(f"Cooldown: {remaining:.0f}s remaining")
                        time.sleep(Config.CHECK_INTERVAL)
                        continue
                
                logger.info("-" * 70)
                logger.info("Scanning 15-minute Up/Down markets...")
                logger.info("")
                
                # Find markets ready for betting
                ready = self.scan_markets()
                
                if not ready:
                    logger.info("")
                    logger.info("No markets in betting window (60-90s before close)")
                    logger.info("Waiting for next opportunity...")
                else:
                    # Analyze each ready market
                    for market in ready:
                        logger.info("")
                        logger.info(f"Analyzing {market['asset']} (closes in {market['seconds_left']:.0f}s)...")
                        
                        bet = self.analyze_bet(market)
                        
                        if bet:
                            self.execute_bet(bet)
                            break  # One bet at a time
                
                logger.info("")
                time.sleep(Config.CHECK_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("")
            logger.info("=" * 70)
            logger.info("Bot stopped by user")
            logger.info(f"Total trades recorded: {len(self.trades)}")
            for t in self.trades[-5:]:
                logger.info(f"  {t['time'][:19]} | {t['asset']} {t['side']} @ {t['price']:.0%}")
            logger.info("=" * 70)

# ============= MAIN =============
if __name__ == "__main__":
    print("")
    print("=" * 50)
    print("  Sharbel's Polymarket Bot v3.0")
    print("  Target: 15-Minute Up/Down Crypto Markets")
    print("=" * 50)
    print("")
    
    # Check packages
    missing = []
    try:
        import requests
    except ImportError:
        missing.append('requests')
    
    try:
        from dotenv import load_dotenv
    except ImportError:
        missing.append('python-dotenv')
    
    if missing:
        print(f"Missing packages: {', '.join(missing)}")
        print(f"Run: pip install {' '.join(missing)}")
        sys.exit(1)
    
    # Check .env
    if not os.path.exists('.env'):
        print("No .env file found!")
        print("")
        print("Create a .env file with:")
        print("  POLYMARKET_PRIVATE_KEY=0x...")
        print("  WALLET_ADDRESS=0x...")
        print("  DRY_RUN=true")
        print("")
    
    # Start bot
    bot = SharbelsBot()
    bot.run()
