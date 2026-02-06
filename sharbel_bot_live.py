#!/usr/bin/env python3
"""
SHARBEL'S POLYMARKET BOT v5.0 - LIVE TRADING
=============================================
Actually places trades on Polymarket using the CLOB API!

REQUIREMENTS:
- pip install py-clob-client
- Polymarket account with funds
- API credentials (auto-generated from private key)
"""

import os
import sys
import time
import json
import logging
import requests
import re
import hmac
import hashlib
import base64
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ============= CONFIG =============
class Config:
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    WALLET_ADDRESS = os.getenv('WALLET_ADDRESS', '')
    
    # API Credentials (will be auto-generated if not provided)
    API_KEY = os.getenv('POLYMARKET_API_KEY', '')
    API_SECRET = os.getenv('POLYMARKET_API_SECRET', '')
    API_PASSPHRASE = os.getenv('POLYMARKET_API_PASSPHRASE', '')
    
    # Signature type: 0 = EOA (MetaMask/Phantom), 1 = Magic.link
    SIGNATURE_TYPE = int(os.getenv('POLYMARKET_SIGNATURE_TYPE', '0'))
    
    # Funder address (for Magic.link users)
    FUNDER = os.getenv('POLYMARKET_FUNDER', '')
    
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    BET_SIZE = float(os.getenv('BET_SIZE', '1'))
    ORDER_SIZE = int(os.getenv('ORDER_SIZE', '5'))  # Minimum 5 shares
    
    # Timing
    SNIPE_WINDOW_START = 90
    SNIPE_WINDOW_END = 15
    WINDOW_15M = 900
    MIN_PRICE_MOVE = 0.1
    
    CHECK_INTERVAL = 5
    COOLDOWN = 120
    
    ASSETS = {
        'BTC': {'slug': 'btc-updown-15m', 'binance': 'BTCUSDT'},
        'ETH': {'slug': 'eth-updown-15m', 'binance': 'ETHUSDT'},
        'SOL': {'slug': 'sol-updown-15m', 'binance': 'SOLUSDT'},
    }
    
    BINANCE_API = "https://api.binance.com/api/v3"
    POLYMARKET_CLOB = "https://clob.polymarket.com"
    POLYGON_RPC = "https://polygon-rpc.com"

# ============= LOGGING =============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(message)s',
    handlers=[
        logging.FileHandler('sharbel_bot_live.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
log = logging.getLogger(__name__)

# ============= POLYMARKET CLOB CLIENT =============
class PolymarketTrader:
    """Handles actual trading on Polymarket"""
    
    def __init__(self):
        self.client = None
        self.api_creds = None
        self.setup_client()
    
    def setup_client(self):
        """Initialize the Polymarket CLOB client"""
        try:
            from py_clob_client.client import ClobClient
            from py_clob_client.clob_types import ApiCreds
            
            if not Config.PRIVATE_KEY:
                log.error("No private key configured!")
                return False
            
            # Create client
            self.client = ClobClient(
                host=Config.POLYMARKET_CLOB,
                key=Config.PRIVATE_KEY,
                chain_id=137,  # Polygon
                signature_type=Config.SIGNATURE_TYPE,
                funder=Config.FUNDER if Config.FUNDER else None
            )
            
            # Get or create API credentials
            if Config.API_KEY and Config.API_SECRET and Config.API_PASSPHRASE:
                self.api_creds = ApiCreds(
                    api_key=Config.API_KEY,
                    api_secret=Config.API_SECRET,
                    api_passphrase=Config.API_PASSPHRASE
                )
                self.client.set_api_creds(self.api_creds)
                log.info("Using existing API credentials")
            else:
                log.info("Deriving API credentials from private key...")
                self.api_creds = self.client.derive_api_key()
                self.client.set_api_creds(self.api_creds)
                log.info(f"API Key: {self.api_creds.api_key[:10]}...")
                log.info("Save these to your .env file!")
            
            log.info("Polymarket client initialized!")
            return True
            
        except ImportError:
            log.error("py-clob-client not installed!")
            log.error("Run: pip install py-clob-client")
            return False
        except Exception as e:
            log.error(f"Failed to setup client: {e}")
            return False
    
    def get_balance(self):
        """Get USDC balance from Polymarket"""
        if not self.client:
            return 0
        try:
            balance = self.client.get_balance()
            return float(balance) if balance else 0
        except Exception as e:
            log.error(f"Error getting balance: {e}")
            return 0
    
    def get_market_info(self, market_slug):
        """Get market token IDs"""
        try:
            # Try gamma API first
            r = requests.get(
                f"https://gamma-api.polymarket.com/markets?slug={market_slug}",
                timeout=10
            )
            if r.status_code == 200:
                markets = r.json()
                if markets and len(markets) > 0:
                    market = markets[0]
                    token_ids = market.get('clobTokenIds', [])
                    if isinstance(token_ids, str):
                        token_ids = json.loads(token_ids)
                    return {
                        'condition_id': market.get('conditionId'),
                        'yes_token': token_ids[0] if len(token_ids) > 0 else None,
                        'no_token': token_ids[1] if len(token_ids) > 1 else None
                    }
            return None
        except Exception as e:
            log.error(f"Error getting market info: {e}")
            return None
    
    def place_order(self, token_id, side, price, size):
        """
        Place an order on Polymarket
        
        Args:
            token_id: The token to buy (YES or NO token)
            side: 'BUY' or 'SELL'
            price: Price per share (0.01 to 0.99)
            size: Number of shares (minimum 5)
        """
        if not self.client:
            log.error("Client not initialized")
            return None
        
        try:
            from py_clob_client.order_builder.constants import BUY, SELL
            
            order_side = BUY if side.upper() == 'BUY' else SELL
            
            log.info(f"Placing order: {side} {size} shares @ ${price:.2f}")
            
            # Create and sign order
            order = self.client.create_order(
                token_id=token_id,
                price=price,
                size=size,
                side=order_side
            )
            
            # Submit order
            result = self.client.post_order(order, "FOK")  # Fill-or-Kill
            
            log.info(f"Order result: {result}")
            return result
            
        except Exception as e:
            log.error(f"Error placing order: {e}")
            return None

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
            r = requests.get(f"{Config.BINANCE_API}/ticker/price", 
                           params={'symbol': symbol}, timeout=5)
            price = float(r.json()['price'])
            self.cache[asset] = price
            self.cache_time[asset] = time.time()
            return price
        except:
            return None

# ============= WINDOW TRACKER =============
class WindowTracker:
    def __init__(self):
        self.window_prices = {}
    
    def get_current_window(self):
        now = int(time.time())
        window_start = (now // Config.WINDOW_15M) * Config.WINDOW_15M
        window_end = window_start + Config.WINDOW_15M
        return {
            'start': window_start,
            'end': window_end,
            'seconds_left': window_end - now,
            'seconds_elapsed': now - window_start
        }
    
    def record_price(self, window_start, asset, price):
        if window_start not in self.window_prices:
            self.window_prices[window_start] = {}
        if asset not in self.window_prices[window_start]:
            self.window_prices[window_start][asset] = price
            log.info(f"  Recorded {asset}: ${price:,.2f}")
    
    def get_price(self, window_start, asset):
        return self.window_prices.get(window_start, {}).get(asset)
    
    def cleanup(self):
        now = int(time.time())
        cutoff = now - (Config.WINDOW_15M * 3)
        old = [w for w in self.window_prices if w < cutoff]
        for w in old:
            del self.window_prices[w]

# ============= MARKET FINDER =============
class MarketFinder:
    def __init__(self):
        self.session = requests.Session()
    
    def find_markets(self):
        """Find active 15-min markets"""
        markets = []
        try:
            r = self.session.get("https://polymarket.com/crypto/15M", timeout=15)
            r.raise_for_status()
            html = r.text
            now = int(time.time())
            
            for asset, config in Config.ASSETS.items():
                pattern = rf"{config['slug']}-(\d+)"
                matches = re.findall(pattern, html)
                if matches:
                    for ts_str in sorted(set(matches), reverse=True):
                        ts = int(ts_str)
                        window_end = ts + Config.WINDOW_15M
                        if now < window_end:
                            markets.append({
                                'asset': asset,
                                'slug': f"{config['slug']}-{ts}",
                                'window_start': ts,
                                'seconds_left': window_end - now
                            })
                            break
            return markets
        except Exception as e:
            log.error(f"Error finding markets: {e}")
            return []

# ============= MAIN BOT =============
class LiveTradingBot:
    def __init__(self):
        self.trader = PolymarketTrader()
        self.binance = BinanceTracker()
        self.tracker = WindowTracker()
        self.finder = MarketFinder()
        
        self.balance = self.trader.get_balance()
        self.trades = []
        self.last_trade = 0
        self.wins = 0
        self.losses = 0
        
        self.print_banner()
    
    def print_banner(self):
        log.info("")
        log.info("=" * 70)
        log.info("   SHARBEL'S LIVE TRADING BOT v5.0")
        log.info("   ACTUALLY TRADES ON POLYMARKET!")
        log.info("=" * 70)
        mode = "DRY RUN" if Config.DRY_RUN else "*** LIVE TRADING ***"
        log.info(f"   Mode: {mode}")
        log.info(f"   Wallet: {Config.WALLET_ADDRESS[:12]}..." if Config.WALLET_ADDRESS else "   Wallet: Not set")
        log.info(f"   Polymarket Balance: ${self.balance:.2f}")
        log.info(f"   Bet Size: ${Config.BET_SIZE}")
        log.info(f"   Order Size: {Config.ORDER_SIZE} shares")
        log.info("=" * 70)
        
        if not self.trader.client:
            log.warning("")
            log.warning("   WARNING: Trading client not initialized!")
            log.warning("   Run: pip install py-clob-client")
            log.warning("")
    
    def execute_snipe(self, asset, direction, open_price, current_price, change_pct, secs_left):
        """Actually execute the trade!"""
        log.info("")
        log.info("*" * 70)
        log.info("   $$$ EXECUTING TRADE $$$")
        log.info("*" * 70)
        log.info(f"   Asset: {asset}")
        log.info(f"   Direction: {direction}")
        log.info(f"   Open: ${open_price:,.2f} -> Current: ${current_price:,.2f}")
        log.info(f"   Change: {change_pct:+.2f}%")
        log.info(f"   Time Left: {secs_left:.0f}s")
        log.info("*" * 70)
        
        if Config.DRY_RUN:
            log.info("")
            log.info("   [DRY RUN - Trade NOT placed]")
            log.info("   Set DRY_RUN=false to trade for real")
            log.info("")
            self.last_trade = time.time()
            return
        
        # Get market info
        window = self.tracker.get_current_window()
        slug = f"{Config.ASSETS[asset]['slug']}-{window['start']}"
        market_info = self.trader.get_market_info(slug)
        
        if not market_info:
            log.error("   Could not get market info!")
            return
        
        # Determine which token to buy
        if direction == 'UP':
            token_id = market_info['yes_token']
            log.info(f"   Buying YES (UP) token: {token_id[:20]}...")
        else:
            token_id = market_info['no_token']
            log.info(f"   Buying NO (DOWN) token: {token_id[:20]}...")
        
        # Place order
        # Price is what we're willing to pay (e.g., 0.60 = 60 cents per share)
        # We'll use a high price to ensure fill (market order essentially)
        order_price = 0.95  # Pay up to 95 cents
        order_size = Config.ORDER_SIZE
        
        log.info(f"   Placing order: BUY {order_size} shares @ ${order_price}")
        
        result = self.trader.place_order(
            token_id=token_id,
            side='BUY',
            price=order_price,
            size=order_size
        )
        
        if result:
            log.info(f"   ORDER PLACED!")
            log.info(f"   Result: {result}")
            self.trades.append({
                'time': datetime.now().isoformat(),
                'asset': asset,
                'direction': direction,
                'change': change_pct,
                'result': result
            })
        else:
            log.error("   ORDER FAILED!")
        
        self.last_trade = time.time()
    
    def tick(self):
        """One iteration"""
        self.tracker.cleanup()
        window = self.tracker.get_current_window()
        secs_left = window['seconds_left']
        secs_elapsed = window['seconds_elapsed']
        
        log.info("-" * 70)
        mins = int(secs_left // 60)
        secs = int(secs_left % 60)
        log.info(f"Window closes in: {mins}m {secs}s")
        
        # Record opening prices
        if secs_elapsed < 30:
            log.info("Recording opening prices...")
            for asset, config in Config.ASSETS.items():
                price = self.binance.get_price(asset)
                if price:
                    self.tracker.record_price(window['start'], asset, price)
        
        # Check snipe window
        in_snipe = Config.SNIPE_WINDOW_END < secs_left <= Config.SNIPE_WINDOW_START
        
        if not in_snipe:
            if secs_left > Config.SNIPE_WINDOW_START:
                log.info(f"Waiting for snipe window...")
            return
        
        log.info("")
        log.info(">>> IN SNIPE WINDOW <<<")
        
        # Cooldown
        if self.last_trade > 0 and time.time() - self.last_trade < Config.COOLDOWN:
            log.info(f"Cooldown active ({Config.COOLDOWN - (time.time() - self.last_trade):.0f}s left)")
            return
        
        # Check each asset
        for asset in Config.ASSETS:
            open_price = self.tracker.get_price(window['start'], asset)
            current_price = self.binance.get_price(asset)
            
            if not open_price or not current_price:
                continue
            
            change_pct = ((current_price - open_price) / open_price) * 100
            
            if change_pct > Config.MIN_PRICE_MOVE:
                direction = 'UP'
            elif change_pct < -Config.MIN_PRICE_MOVE:
                direction = 'DOWN'
            else:
                continue
            
            log.info(f"{asset}: ${open_price:,.2f} -> ${current_price:,.2f} ({change_pct:+.2f}%) {direction}")
            
            self.execute_snipe(asset, direction, open_price, current_price, change_pct, secs_left)
            return
    
    def run(self):
        log.info("")
        log.info("Starting live trading bot...")
        log.info("")
        
        try:
            while True:
                self.tick()
                time.sleep(Config.CHECK_INTERVAL)
        except KeyboardInterrupt:
            log.info("")
            log.info("Bot stopped")
            log.info(f"Trades: {len(self.trades)}")

# ============= MAIN =============
if __name__ == "__main__":
    print("")
    print("=" * 50)
    print("  SHARBEL'S LIVE TRADING BOT v5.0")
    print("=" * 50)
    print("")
    
    # Check for py-clob-client
    try:
        import py_clob_client
        print("py-clob-client: OK")
    except ImportError:
        print("py-clob-client: NOT INSTALLED")
        print("")
        print("To enable live trading, run:")
        print("  pip install py-clob-client")
        print("")
        print("Starting in monitoring mode...")
    
    print("")
    
    if not os.path.exists('.env'):
        print("Create .env with:")
        print("  POLYMARKET_PRIVATE_KEY=0x...")
        print("  WALLET_ADDRESS=0x...")
        print("  DRY_RUN=false")
        print("  BET_SIZE=1")
        print("  ORDER_SIZE=5")
        print("")
    
    bot = LiveTradingBot()
    bot.run()
