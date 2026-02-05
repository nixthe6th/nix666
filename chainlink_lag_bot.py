#!/usr/bin/env python3
"""
Chainlink Lag Exploit Bot v2.1
===============================
SHARBEL'S STRATEGY: Wait until 60 seconds before market close, then bet

The Play:
1. Find 15-minute crypto markets on Polymarket
2. Wait until there's only ~60 seconds left
3. Check Binance price vs. target price
4. If price is clearly above/below target → bet on the obvious outcome
5. With only 60 seconds left, price won't move much → easy win
"""

import os
import sys
import time
import json
import logging
import requests
import re
from datetime import datetime, timezone, timedelta
from dateutil import parser as date_parser
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
    
    # SHARBEL'S TIMING STRATEGY
    BET_WINDOW_START = 90    # Start looking when 90 seconds left
    BET_WINDOW_END = 30      # Stop betting when only 30 seconds left (too risky)
    IDEAL_BET_TIME = 60      # Ideal: bet at 60 seconds before close
    
    # Edge Requirements
    MIN_PRICE_BUFFER = 0.5   # Price must be 0.5% away from target to bet
    MAX_ODDS_TO_BUY = 0.80   # Don't buy if odds already > 80%
    MIN_ODDS_TO_BUY = 0.20   # Don't buy if odds < 20%
    
    # Timing
    CHECK_INTERVAL = 5
    COOLDOWN_AFTER_TRADE = 120
    
    # Assets
    ASSETS = {'BTC': 'BTCUSDT', 'ETH': 'ETHUSDT', 'SOL': 'SOLUSDT'}
    
    # APIs
    BINANCE_API = "https://api.binance.com/api/v3"
    POLYMARKET_API = "https://gamma-api.polymarket.com"
    POLYGON_RPC = "https://polygon-rpc.com"
    USDC_CONTRACT = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

# ============= LOGGING =============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(message)s',
    handlers=[
        logging.FileHandler('chainlink_lag_bot.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ============= HELPERS =============
def get_wallet_address_from_key(private_key):
    try:
        from eth_account import Account
        if private_key and private_key.startswith('0x'):
            return Account.from_key(private_key).address
    except:
        pass
    return None

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

# ============= POLYMARKET =============
class PolymarketScanner:
    def __init__(self):
        self.session = requests.Session()
    
    def get_markets(self):
        """Get all active 15-min crypto markets with timing info"""
        try:
            url = f"{Config.POLYMARKET_API}/markets"
            r = self.session.get(url, params={"active": "true", "closed": "false", "limit": 100}, timeout=15)
            r.raise_for_status()
            markets = r.json()
            
            results = []
            for m in markets:
                parsed = self.parse_market(m)
                if parsed:
                    results.append(parsed)
            
            return results
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []
    
    def parse_market(self, m):
        """Parse market and calculate time remaining"""
        try:
            question = m.get('question', '').lower()
            
            # Must be 15-min market
            if not any(x in question for x in ['15 min', '15-min', '15min']):
                return None
            
            # Must be crypto
            asset = None
            for a in Config.ASSETS:
                if a.lower() in question:
                    asset = a
                    break
            if not asset:
                return None
            
            # Get end time
            end_str = m.get('endDate') or m.get('end_date_iso')
            if not end_str:
                return None
            
            try:
                end_time = date_parser.parse(end_str)
                if end_time.tzinfo is None:
                    end_time = end_time.replace(tzinfo=timezone.utc)
            except:
                return None
            
            # Calculate seconds remaining
            now = datetime.now(timezone.utc)
            seconds_left = (end_time - now).total_seconds()
            
            # Extract target price
            price_match = re.search(r'\$?([\d,]+\.?\d*)', m.get('question', ''))
            target_price = float(price_match.group(1).replace(',', '')) if price_match else None
            
            # Direction
            q = m.get('question', '').lower()
            direction = 'above' if 'above' in q or 'higher' in q else 'below' if 'below' in q or 'lower' in q else None
            
            # Odds
            try:
                prices = json.loads(m.get('outcomePrices', '["0.5","0.5"]'))
                yes_price = float(prices[0])
                no_price = float(prices[1]) if len(prices) > 1 else 1 - yes_price
            except:
                yes_price, no_price = 0.5, 0.5
            
            return {
                'id': m.get('id'),
                'question': m.get('question', ''),
                'asset': asset,
                'target_price': target_price,
                'direction': direction,
                'yes_price': yes_price,
                'no_price': no_price,
                'end_time': end_time,
                'seconds_left': seconds_left,
                'token_ids': m.get('clobTokenIds', [])
            }
        except Exception as e:
            return None

# ============= BINANCE =============
class BinancePrice:
    def __init__(self):
        self.cache = {}
        self.cache_time = {}
    
    def get(self, asset):
        if asset in self.cache and time.time() - self.cache_time.get(asset, 0) < 2:
            return self.cache[asset]
        try:
            symbol = Config.ASSETS.get(asset)
            r = requests.get(f"{Config.BINANCE_API}/ticker/price", params={'symbol': symbol}, timeout=5)
            price = float(r.json()['price'])
            self.cache[asset] = price
            self.cache_time[asset] = time.time()
            return price
        except:
            return None

# ============= BOT =============
class SharbelsBot:
    def __init__(self):
        self.scanner = PolymarketScanner()
        self.binance = BinancePrice()
        self.wallet = Config.WALLET_ADDRESS or get_wallet_address_from_key(Config.PRIVATE_KEY)
        self.balance = get_usdc_balance(self.wallet) or 0
        self.trades = []
        self.last_trade = 0
        
        self.print_banner()
    
    def print_banner(self):
        logger.info("")
        logger.info("=" * 65)
        logger.info("   SHARBEL'S POLYMARKET BOT v2.1")
        logger.info("   Strategy: Bet 60 seconds before market closes")
        logger.info("=" * 65)
        logger.info(f"   Mode: {'DRY RUN' if Config.DRY_RUN else '*** LIVE ***'}")
        logger.info(f"   Wallet: {self.wallet[:12]}...{self.wallet[-6:]}" if self.wallet else "   Wallet: Not set")
        logger.info(f"   Balance: ${self.balance:.2f} USDC")
        logger.info(f"   Bet Size: ${Config.BET_SIZE}")
        logger.info(f"   Bet Window: {Config.BET_WINDOW_START}s to {Config.BET_WINDOW_END}s before close")
        logger.info("=" * 65)
        logger.info("")
        logger.info("   HOW IT WORKS:")
        logger.info("   1. Scan for 15-min markets about to close")
        logger.info("   2. Wait until 60 seconds remaining")
        logger.info("   3. Check if Binance price is clearly above/below target")
        logger.info("   4. Bet on the obvious outcome")
        logger.info("   5. With only 60s left, price won't move much = easy win")
        logger.info("")
        logger.info("=" * 65)
        logger.info("")
    
    def find_ready_market(self):
        """Find a market that's in the betting window (60-90 seconds left)"""
        markets = self.scanner.get_markets()
        
        ready_markets = []
        
        for m in markets:
            secs = m['seconds_left']
            
            # Log all markets with time
            status = ""
            if secs <= 0:
                status = "CLOSED"
            elif secs < Config.BET_WINDOW_END:
                status = "TOO LATE"
            elif secs <= Config.BET_WINDOW_START:
                status = ">>> READY TO BET <<<"
            else:
                mins = int(secs // 60)
                status = f"waiting ({mins}m {int(secs % 60)}s left)"
            
            logger.info(f"  {m['asset']}: {m['question'][:40]}... [{status}]")
            
            # Check if in betting window
            if Config.BET_WINDOW_END < secs <= Config.BET_WINDOW_START:
                ready_markets.append(m)
        
        return ready_markets
    
    def analyze_bet(self, market):
        """Decide whether to bet YES or NO"""
        asset = market['asset']
        target = market['target_price']
        direction = market['direction']
        yes_price = market['yes_price']
        no_price = market['no_price']
        
        if not target or not direction:
            return None
        
        # Get current Binance price
        current = self.binance.get(asset)
        if not current:
            return None
        
        # How far is price from target?
        diff_percent = ((current - target) / target) * 100
        
        # Determine the likely outcome
        if direction == 'above':
            # Market: "Will price be ABOVE target?"
            if current > target and diff_percent > Config.MIN_PRICE_BUFFER:
                # Price is ABOVE target → YES should win
                bet_side = 'YES'
                bet_price = yes_price
            elif current < target and abs(diff_percent) > Config.MIN_PRICE_BUFFER:
                # Price is BELOW target → NO should win
                bet_side = 'NO'
                bet_price = no_price
            else:
                return None  # Too close to call
        else:  # direction == 'below'
            # Market: "Will price be BELOW target?"
            if current < target and abs(diff_percent) > Config.MIN_PRICE_BUFFER:
                bet_side = 'YES'
                bet_price = yes_price
            elif current > target and diff_percent > Config.MIN_PRICE_BUFFER:
                bet_side = 'NO'
                bet_price = no_price
            else:
                return None
        
        # Check odds bounds
        if bet_price > Config.MAX_ODDS_TO_BUY:
            logger.info(f"    Odds too high ({bet_price:.2f}) - skipping")
            return None
        if bet_price < Config.MIN_ODDS_TO_BUY:
            logger.info(f"    Odds too low ({bet_price:.2f}) - might be trap")
            return None
        
        # Calculate expected profit
        # If we bet $1 at 0.60 odds and win, we get $1.67 back (1/0.60)
        potential_return = Config.BET_SIZE / bet_price
        potential_profit = potential_return - Config.BET_SIZE
        
        return {
            'market': market,
            'bet_side': bet_side,
            'bet_price': bet_price,
            'current_price': current,
            'target_price': target,
            'diff_percent': diff_percent,
            'potential_profit': potential_profit,
            'seconds_left': market['seconds_left']
        }
    
    def execute_bet(self, bet):
        """Execute the bet"""
        m = bet['market']
        
        logger.info("")
        logger.info("*" * 65)
        logger.info("   $$$ PLACING BET $$$")
        logger.info("*" * 65)
        logger.info(f"   Market: {m['question'][:50]}...")
        logger.info(f"   Time Left: {bet['seconds_left']:.0f} seconds")
        logger.info("")
        logger.info(f"   {bet['market']['asset']} Price: ${bet['current_price']:,.2f}")
        logger.info(f"   Target: ${bet['target_price']:,.2f}")
        logger.info(f"   Difference: {bet['diff_percent']:+.2f}%")
        logger.info("")
        logger.info(f"   >>> BET: {bet['bet_side']} @ {bet['bet_price']:.2f} <<<")
        logger.info(f"   Bet Size: ${Config.BET_SIZE}")
        logger.info(f"   Potential Profit: ${bet['potential_profit']:.2f}")
        logger.info("*" * 65)
        
        if Config.DRY_RUN:
            logger.info("")
            logger.info("   [DRY RUN - Bet logged but not placed]")
            logger.info("   Set DRY_RUN=false in .env for live trading")
        else:
            logger.info("")
            logger.info("   [LIVE] Would place order via CLOB API...")
            # TODO: Implement actual order placement
        
        logger.info("")
        
        self.trades.append({
            'time': datetime.now().isoformat(),
            'market': m['question'][:50],
            'side': bet['bet_side'],
            'price': bet['bet_price'],
            'bet_size': Config.BET_SIZE,
            'dry_run': Config.DRY_RUN
        })
        
        self.last_trade = time.time()
    
    def run(self):
        """Main loop"""
        logger.info("Starting bot... scanning every 5 seconds")
        logger.info("")
        
        try:
            while True:
                # Cooldown check
                if self.last_trade > 0 and time.time() - self.last_trade < Config.COOLDOWN_AFTER_TRADE:
                    remaining = Config.COOLDOWN_AFTER_TRADE - (time.time() - self.last_trade)
                    logger.info(f"Cooldown: {remaining:.0f}s")
                    time.sleep(Config.CHECK_INTERVAL)
                    continue
                
                logger.info("-" * 65)
                logger.info("Scanning 15-minute markets...")
                
                ready = self.find_ready_market()
                
                if not ready:
                    logger.info("No markets in betting window. Waiting...")
                    time.sleep(Config.CHECK_INTERVAL)
                    continue
                
                # Analyze each ready market
                for market in ready:
                    logger.info("")
                    logger.info(f"Analyzing: {market['question'][:50]}...")
                    
                    bet = self.analyze_bet(market)
                    
                    if bet:
                        self.execute_bet(bet)
                        break  # One bet at a time
                    else:
                        logger.info("  Price too close to target - no clear edge")
                
                time.sleep(Config.CHECK_INTERVAL)
                
        except KeyboardInterrupt:
            logger.info("")
            logger.info("Bot stopped. Total trades: " + str(len(self.trades)))

# ============= MAIN =============
if __name__ == "__main__":
    print("")
    print("Sharbel's Polymarket Bot v2.1")
    print("=" * 40)
    
    # Check packages
    try:
        import requests
        from dotenv import load_dotenv
        from dateutil import parser
    except ImportError as e:
        print(f"Missing: {e}")
        print("Run: pip install requests python-dotenv python-dateutil")
        sys.exit(1)
    
    if not os.path.exists('.env'):
        print("Create .env file with:")
        print("  POLYMARKET_PRIVATE_KEY=0x...")
        print("  WALLET_ADDRESS=0x...")
        print("  DRY_RUN=true")
    
    print("")
    bot = SharbelsBot()
    bot.run()
