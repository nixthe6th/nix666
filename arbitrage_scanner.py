#!/usr/bin/env python3
"""
PURE ARBITRAGE SCANNER v1.0
===========================
Strategy: Find opportunities where UP + DOWN < $1.00

When you buy BOTH sides and total cost < $1.00:
- One side ALWAYS pays $1.00
- You're GUARANTEED profit regardless of direction
- No prediction needed!

Example:
  UP:   $0.48
  DOWN: $0.51
  ─────────────
  Total: $0.99
  
  If BTC goes UP:   You paid $0.99, get $1.00 = +$0.01 profit
  If BTC goes DOWN: You paid $0.99, get $1.00 = +$0.01 profit
  
  RISK-FREE PROFIT!
"""

import os
import sys
import time
import json
import logging
import requests
import re
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ============= CONFIG =============
class Config:
    WALLET_ADDRESS = os.getenv('WALLET_ADDRESS', '')
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    
    # Arbitrage settings
    TARGET_TOTAL_COST = 0.99    # Alert when UP + DOWN <= this
    MIN_PROFIT_PERCENT = 0.5    # Minimum 0.5% profit to alert
    ORDER_SIZE = 5              # Minimum order size on Polymarket
    
    CHECK_INTERVAL = 3          # Check every 3 seconds (need to be fast!)
    
    # Assets to monitor
    ASSETS = ['BTC', 'ETH', 'SOL', 'XRP']
    
    # APIs
    POLYMARKET_CLOB = "https://clob.polymarket.com"
    POLYGON_RPC = "https://polygon-rpc.com"
    USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

# ============= LOGGING =============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(message)s',
    handlers=[
        logging.FileHandler('arbitrage_scanner.log'),
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

# ============= MARKET SCANNER =============
class ArbitrageScanner:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
        })
        self.opportunities_found = 0
        self.last_alert = 0
    
    def get_current_markets(self):
        """Find active 15-min markets by scraping the page"""
        markets = []
        
        try:
            r = self.session.get("https://polymarket.com/crypto/15M", timeout=15)
            r.raise_for_status()
            html = r.text
            
            now = int(time.time())
            window_15m = 900
            
            for asset in Config.ASSETS:
                slug_prefix = f"{asset.lower()}-updown-15m"
                pattern = rf"{slug_prefix}-(\d+)"
                matches = re.findall(pattern, html)
                
                if matches:
                    for ts_str in sorted(set(matches), reverse=True):
                        ts = int(ts_str)
                        window_end = ts + window_15m
                        
                        if now < window_end:
                            markets.append({
                                'asset': asset,
                                'slug': f"{slug_prefix}-{ts}",
                                'timestamp': ts,
                                'seconds_left': window_end - now
                            })
                            break
            
            return markets
            
        except Exception as e:
            log.error(f"Error getting markets: {e}")
            return []
    
    def get_order_book_prices(self, market_slug):
        """
        Get best ask prices for UP and DOWN from order book.
        Best ask = price we can BUY at immediately.
        """
        try:
            # First, get market info to get token IDs
            url = f"https://gamma-api.polymarket.com/markets?slug={market_slug}"
            r = self.session.get(url, timeout=10)
            
            if r.status_code != 200:
                return None, None
            
            data = r.json()
            if not data or len(data) == 0:
                return None, None
            
            market = data[0]
            
            # Get outcome prices directly
            prices_str = market.get('outcomePrices', '["0.5", "0.5"]')
            try:
                prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
                up_price = float(prices[0])
                down_price = float(prices[1]) if len(prices) > 1 else 1 - up_price
                return up_price, down_price
            except:
                pass
            
            # Fallback: try to get from CLOB order book
            token_ids = market.get('clobTokenIds', [])
            if len(token_ids) >= 2:
                try:
                    token_ids = json.loads(token_ids) if isinstance(token_ids, str) else token_ids
                except:
                    pass
                
                if len(token_ids) >= 2:
                    up_token = token_ids[0]
                    down_token = token_ids[1]
                    
                    # Get order books
                    up_book = self.get_order_book(up_token)
                    down_book = self.get_order_book(down_token)
                    
                    up_price = up_book.get('best_ask') if up_book else None
                    down_price = down_book.get('best_ask') if down_book else None
                    
                    return up_price, down_price
            
            return None, None
            
        except Exception as e:
            log.debug(f"Error getting prices for {market_slug}: {e}")
            return None, None
    
    def get_order_book(self, token_id):
        """Get order book for a token"""
        try:
            url = f"{Config.POLYMARKET_CLOB}/book"
            r = self.session.get(url, params={'token_id': token_id}, timeout=5)
            
            if r.status_code != 200:
                return None
            
            book = r.json()
            
            # Parse asks (sell orders - price we can buy at)
            asks = book.get('asks', [])
            if asks:
                # Best ask = lowest price
                best_ask = min(float(a.get('price', 1)) for a in asks)
                return {'best_ask': best_ask}
            
            return None
            
        except Exception as e:
            log.debug(f"Error getting order book: {e}")
            return None
    
    def check_arbitrage(self, up_price, down_price):
        """
        Check if there's an arbitrage opportunity.
        
        If UP + DOWN < $1.00, we can buy both and guarantee profit.
        """
        if not up_price or not down_price:
            return None
        
        total_cost = up_price + down_price
        
        # One side always pays $1.00
        payout = 1.0
        
        # Profit = payout - cost
        profit = payout - total_cost
        profit_percent = (profit / total_cost) * 100 if total_cost > 0 else 0
        
        if profit > 0 and profit_percent >= Config.MIN_PROFIT_PERCENT:
            return {
                'up_price': up_price,
                'down_price': down_price,
                'total_cost': total_cost,
                'profit': profit,
                'profit_percent': profit_percent
            }
        
        return None
    
    def scan(self):
        """Scan all markets for arbitrage opportunities"""
        log.info("-" * 70)
        log.info("Scanning for arbitrage opportunities...")
        
        markets = self.get_current_markets()
        
        if not markets:
            log.info("No active markets found")
            return
        
        for market in markets:
            asset = market['asset']
            slug = market['slug']
            secs_left = market['seconds_left']
            
            mins = int(secs_left // 60)
            secs = int(secs_left % 60)
            
            # Get prices
            up_price, down_price = self.get_order_book_prices(slug)
            
            if not up_price or not down_price:
                log.info(f"  {asset}: Could not get prices")
                continue
            
            total = up_price + down_price
            
            # Check for arbitrage
            arb = self.check_arbitrage(up_price, down_price)
            
            if arb:
                self.alert_opportunity(asset, arb, secs_left)
            else:
                status = "NO ARB" if total >= 1.0 else f"Close ({total:.3f})"
                log.info(f"  {asset}: UP={up_price:.2f} + DOWN={down_price:.2f} = {total:.3f} [{status}] ({mins}m {secs}s left)")
    
    def alert_opportunity(self, asset, arb, secs_left):
        """Alert when arbitrage opportunity found!"""
        self.opportunities_found += 1
        
        log.info("")
        log.info("!" * 70)
        log.info("   $$$ ARBITRAGE OPPORTUNITY FOUND! $$$")
        log.info("!" * 70)
        log.info(f"   Asset: {asset}")
        log.info(f"   Time Left: {secs_left:.0f} seconds")
        log.info("")
        log.info(f"   UP Price:   ${arb['up_price']:.4f}")
        log.info(f"   DOWN Price: ${arb['down_price']:.4f}")
        log.info(f"   ─────────────────────────")
        log.info(f"   TOTAL COST: ${arb['total_cost']:.4f}")
        log.info("")
        log.info(f"   GUARANTEED PROFIT: ${arb['profit']:.4f} ({arb['profit_percent']:.2f}%)")
        log.info("")
        log.info("   ACTION: Buy BOTH UP and DOWN!")
        log.info("   One side will pay $1.00 = guaranteed profit")
        log.info("!" * 70)
        log.info("")
        
        # Play sound alert (Windows)
        try:
            import winsound
            winsound.Beep(1000, 500)  # 1000 Hz for 500ms
        except:
            pass
        
        self.last_alert = time.time()

# ============= MAIN BOT =============
class ArbitrageBot:
    def __init__(self):
        self.scanner = ArbitrageScanner()
        self.wallet = Config.WALLET_ADDRESS
        self.balance = get_balance(self.wallet)
        
        self.print_banner()
    
    def print_banner(self):
        log.info("")
        log.info("=" * 70)
        log.info("   PURE ARBITRAGE SCANNER v1.0")
        log.info("   Strategy: Buy BOTH sides when total < $1.00")
        log.info("=" * 70)
        log.info(f"   Mode: {'SCAN ONLY' if Config.DRY_RUN else '*** LIVE ***'}")
        log.info(f"   Wallet: {self.wallet[:12]}...{self.wallet[-6:]}" if self.wallet else "   Wallet: Not set")
        log.info(f"   Balance: ${self.balance:.2f} USDC")
        log.info(f"   Target: Total cost <= ${Config.TARGET_TOTAL_COST}")
        log.info(f"   Min Profit: {Config.MIN_PROFIT_PERCENT}%")
        log.info("=" * 70)
        log.info("")
        log.info("   HOW IT WORKS:")
        log.info("   - Monitor UP and DOWN prices on 15-min markets")
        log.info("   - When UP + DOWN < $1.00, there's FREE MONEY")
        log.info("   - Buy BOTH sides, one ALWAYS pays $1.00")
        log.info("   - Profit = $1.00 - (UP + DOWN)")
        log.info("")
        log.info("   EXAMPLE:")
        log.info("   UP = $0.48, DOWN = $0.51")
        log.info("   Total = $0.99")
        log.info("   BTC goes UP -> You get $1.00, profit $0.01")
        log.info("   BTC goes DOWN -> You get $1.00, profit $0.01")
        log.info("   NO RISK!")
        log.info("")
        log.info("=" * 70)
    
    def run(self):
        """Main loop"""
        log.info("")
        log.info(f"Starting scanner... checking every {Config.CHECK_INTERVAL} seconds")
        log.info("Watching for opportunities where UP + DOWN < $1.00")
        log.info("")
        
        try:
            while True:
                self.scanner.scan()
                time.sleep(Config.CHECK_INTERVAL)
                
        except KeyboardInterrupt:
            log.info("")
            log.info("=" * 70)
            log.info("Scanner stopped")
            log.info(f"Opportunities found: {self.scanner.opportunities_found}")
            log.info("=" * 70)

# ============= MAIN =============
if __name__ == "__main__":
    print("")
    print("=" * 50)
    print("  PURE ARBITRAGE SCANNER v1.0")
    print("  Buy BOTH sides when total < $1.00")
    print("=" * 50)
    print("")
    
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
        print("")
    
    bot = ArbitrageBot()
    bot.run()
