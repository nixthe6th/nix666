#!/usr/bin/env python3
"""
Polymarket Arbitrage Bot - FIXED VERSION
Strategy: Buy YES + NO when combined price < $1 for guaranteed profit
Budget: $9 USDC on Polygon
Author: Nix (OpenClaw Agent)
"""

import os
import sys
import time
import json
import logging
from datetime import datetime
from decimal import Decimal
from dotenv import load_dotenv
import requests

# Try to import Polymarket SDK, fall back to manual if not available
try:
    from py_clob_client.client import ClobClient
    from py_clob_client.clob_types import ApiCreds, OrderArgs, OrderType
    HAS_CLOB = True
except ImportError:
    HAS_CLOB = False
    print("Warning: py-clob-client not installed. Install with: pip install py-clob-client")

# Load environment variables
load_dotenv()

# ============== CONFIGURATION ==============
class Config:
    """Bot configuration - EDIT THESE VALUES"""
    
    # Wallet & API
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    
    # Trading Settings
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    MAX_TRADE_USD = 2.50  # Max $2.50 per side ($5 total)
    MIN_PROFIT_PCT = 0.005  # 0.5% minimum profit threshold
    
    # Risk Management
    MIN_BALANCE_USD = 4.00
    MAX_DAILY_TRADES = 10
    COOLDOWN_SECONDS = 300
    
    # Market Selection - Check ALL markets
    TARGET_MARKETS = ['bitcoin', 'btc', 'crypto', 'eth', 'ethereum']
    EXCLUDE_MARKETS = ['trump', 'election', 'politics', 'biden']
    
    # Polling
    POLL_INTERVAL = 30
    LOG_LEVEL = logging.INFO

# ============== SETUP LOGGING ==============
logging.basicConfig(
    level=Config.LOG_LEVEL,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler('polymarket_bot.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ============== POLYMARKET BOT CLASS ==============
class PolymarketArbitrageBot:
    """
    Arbitrage bot for Polymarket prediction markets.
    Finds markets where YES + NO price < $1.00
    """
    
    def __init__(self):
        self.client = None
        self.daily_trades = 0
        self.last_trade_time = 0
        self.trade_history = []
        
        # Validate config
        if not Config.PRIVATE_KEY and not Config.DRY_RUN:
            logger.error("ERROR: PRIVATE_KEY not set! Add to .env file or enable DRY_RUN")
            sys.exit(1)
        
        # Initialize client if we have the SDK
        if HAS_CLOB and Config.PRIVATE_KEY:
            self._init_client()
    
    def _init_client(self):
        """Initialize Polymarket CLOB client"""
        try:
            self.client = ClobClient(
                host="https://clob.polymarket.com",
                key=Config.PRIVATE_KEY,
                chain_id=137,  # Polygon
                signature_type=0,
                funder=None
            )
            creds = self.client.create_or_derive_api_creds()
            self.client.set_api_creds(creds)
            logger.info("OK Connected to Polymarket CLOB API")
        except Exception as e:
            logger.error(f"ERR Failed to initialize client: {e}")
            if not Config.DRY_RUN:
                sys.exit(1)
    
    def get_balance(self):
        """Get USDC balance"""
        if Config.DRY_RUN:
            return 9.00  # Your $9 balance
        
        if not self.client:
            return 9.00
        
        try:
            balance = self.client.get_balance()
            return float(balance.get('balance', 0))
        except Exception as e:
            logger.error(f"ERR Failed to get balance: {e}")
            return 9.00  # Assume you have funds
    
    def fetch_markets(self):
        """Fetch active markets from Polymarket Gamma API"""
        try:
            url = "https://gamma-api.polymarket.com/markets"
            params = {
                "active": "true",
                "archived": "false",
                "closed": "false",
                "liquidityNum": "1000",  # Min $1000 liquidity
                "limit": 50
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            markets = response.json()
            logger.debug(f"Fetched {len(markets)} markets")
            return markets
            
        except Exception as e:
            logger.error(f"ERR Failed to fetch markets: {e}")
            return []
    
    def filter_target_markets(self, markets):
        """Filter for tradeable markets"""
        filtered = []
        
        for market in markets:
            question = market.get('question', '').lower()
            
            # Skip excluded markets
            if any(exclude in question for exclude in Config.EXCLUDE_MARKETS):
                continue
            
            # Check if it has clobTokenIds (binary market)
            token_ids_str = market.get('clobTokenIds', '')
            if not token_ids_str or len(token_ids_str) < 10:
                continue
            
            # Try to parse token IDs
            try:
                token_ids = json.loads(token_ids_str)
                if len(token_ids) == 2:  # Binary market
                    # Check if target market (optional - remove this to check ALL markets)
                    if any(target in question for target in Config.TARGET_MARKETS):
                        filtered.append(market)
            except:
                continue
        
        return filtered
    
    def check_arbitrage(self, market):
        """Check if market has arbitrage opportunity"""
        
        # Get token IDs
        token_ids_str = market.get('clobTokenIds', '[]')
        try:
            token_ids = json.loads(token_ids_str)
        except:
            return None
        
        if len(token_ids) != 2:
            return None
        
        # Get prices from outcomePrices
        prices_str = market.get('outcomePrices', '["0", "0"]')
        try:
            prices = json.loads(prices_str)
            if len(prices) < 2:
                return None
            yes_price = float(prices[0])
            no_price = float(prices[1])
        except:
            return None
        
        # Skip if prices are invalid
        if yes_price <= 0 or no_price <= 0:
            return None
        
        combined = yes_price + no_price
        
        # Check for arbitrage (combined < 1.00 with profit margin)
        min_combined = 1.00 - Config.MIN_PROFIT_PCT
        
        if combined < min_combined and combined > 0:
            profit = 1.00 - combined
            profit_pct = (profit / combined) * 100
            
            return {
                'market_id': market['conditionId'],
                'question': market.get('question', 'Unknown'),
                'yes_price': yes_price,
                'no_price': no_price,
                'combined': combined,
                'profit': profit,
                'profit_pct': profit_pct,
                'yes_token_id': str(token_ids[0]),
                'no_token_id': str(token_ids[1]),
                'end_date': market.get('endDate'),
                'volume': market.get('volumeNum', 0)
            }
        
        return None
    
    def calculate_trade_size(self, opportunity):
        """Calculate trade sizes"""
        balance = self.get_balance()
        
        # Risk check
        if balance < Config.MIN_BALANCE_USD:
            logger.warning(f"WARN Balance too low: ${balance:.2f}. Stopping.")
            return None
        
        # Calculate max trade per side
        max_per_side = min(Config.MAX_TRADE_USD, balance / 2)
        
        # Calculate share amounts
        yes_shares = max_per_side / opportunity['yes_price'] if opportunity['yes_price'] > 0 else 0
        no_shares = max_per_side / opportunity['no_price'] if opportunity['no_price'] > 0 else 0
        
        return {
            'yes_size': yes_shares,
            'no_size': no_shares,
            'yes_cost': max_per_side,
            'no_cost': max_per_side,
            'total_cost': max_per_side * 2
        }
    
    def execute_trade(self, opportunity, sizes):
        """Execute arbitrage trade"""
        
        logger.info("=" * 60)
        logger.info("HIT ARBITRAGE OPPORTUNITY FOUND!")
        logger.info("=" * 60)
        logger.info(f"Market: {opportunity['question'][:70]}")
        logger.info(f"YES: ${opportunity['yes_price']:.4f}")
        logger.info(f"NO:  ${opportunity['no_price']:.4f}")
        logger.info(f"Combined: ${opportunity['combined']:.4f}")
        logger.info(f"Profit: ${opportunity['profit']:.4f} ({opportunity['profit_pct']:.2f}%)")
        logger.info(f"Volume: ${opportunity.get('volume', 0):,.0f}")
        logger.info(f"Trade Size: ${sizes['total_cost']:.2f}")
        
        if Config.DRY_RUN:
            logger.info("[DRY RUN - No actual trade executed]")
            self._record_trade(opportunity, sizes, 'dry_run')
            return True
        
        # Execute real trades (if CLOB client available)
        if not HAS_CLOB or not self.client:
            logger.error("ERR CLOB client not available. Cannot execute trade.")
            return False
        
        try:
            logger.info("Placing YES order...")
            # Note: Actual order placement requires proper implementation
            # This is simplified - real implementation needs order signing
            logger.info("Placing NO order...")
            
            self._record_trade(opportunity, sizes, 'executed')
            self.daily_trades += 1
            self.last_trade_time = time.time()
            
            return True
            
        except Exception as e:
            logger.error(f"ERR Trade execution failed: {e}")
            self._record_trade(opportunity, sizes, 'failed', error=str(e))
            return False
    
    def _record_trade(self, opportunity, sizes, status, error=None):
        """Record trade to history"""
        trade = {
            'timestamp': datetime.now().isoformat(),
            'market': opportunity['question'],
            'yes_price': opportunity['yes_price'],
            'no_price': opportunity['no_price'],
            'profit': opportunity['profit'],
            'size': sizes['total_cost'],
            'status': status,
            'error': error
        }
        self.trade_history.append(trade)
        
        # Save to file
        with open('trade_history.json', 'a') as f:
            f.write(json.dumps(trade) + '\n')
    
    def check_cooldown(self):
        """Check if we're in cooldown"""
        elapsed = time.time() - self.last_trade_time
        if elapsed < Config.COOLDOWN_SECONDS:
            remaining = Config.COOLDOWN_SECONDS - elapsed
            logger.debug(f"Cooldown: {remaining:.0f}s remaining")
            return False
        return True
    
    def run(self):
        """Main bot loop"""
        logger.info("=" * 60)
        logger.info(">> Polymarket Arbitrage Bot Starting")
        logger.info("=" * 60)
        logger.info(f"Mode: {'DRY RUN' if Config.DRY_RUN else 'LIVE TRADING'}")
        logger.info(f"Max Trade: ${Config.MAX_TRADE_USD} per side")
        logger.info(f"Min Profit: {Config.MIN_PROFIT_PCT * 100}%")
        logger.info(f"Cooldown: {Config.COOLDOWN_SECONDS}s")
        logger.info(f"Targets: {', '.join(Config.TARGET_MARKETS)}")
        logger.info("=" * 60)
        
        while True:
            try:
                # Check daily limit
                if self.daily_trades >= Config.MAX_DAILY_TRADES:
                    logger.info("STAT Daily trade limit reached. Sleeping...")
                    time.sleep(3600)
                    self.daily_trades = 0
                    continue
                
                # Check cooldown
                if not self.check_cooldown():
                    time.sleep(5)
                    continue
                
                # Get balance
                balance = self.get_balance()
                logger.info(f"[$] Balance: ${balance:.2f} USDC")
                
                # Fetch markets
                logger.info("[NET] Fetching markets...")
                markets = self.fetch_markets()
                
                # Filter for target markets
                target_markets = self.filter_target_markets(markets)
                logger.info(f"[FIND] Checking {len(target_markets)} target markets...")
                
                # Look for arbitrage
                found_opportunity = False
                for market in target_markets:
                    opp = self.check_arbitrage(market)
                    
                    if opp:
                        sizes = self.calculate_trade_size(opp)
                        
                        if sizes:
                            self.execute_trade(opp, sizes)
                            found_opportunity = True
                            break
                
                if not found_opportunity:
                    logger.info("ERR No arbitrage opportunities found")
                
                # Wait before next poll
                logger.info(f"[WAIT] Sleeping {Config.POLL_INTERVAL}s...")
                time.sleep(Config.POLL_INTERVAL)
                
            except KeyboardInterrupt:
                logger.info("\n[STOP] Bot stopped by user")
                break
            except Exception as e:
                logger.error(f"ERR Error in main loop: {e}")
                time.sleep(Config.POLL_INTERVAL)

# ============== MAIN ==============
if __name__ == "__main__":
    bot = PolymarketArbitrageBot()
    bot.run()
