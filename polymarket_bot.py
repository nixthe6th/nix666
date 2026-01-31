#!/usr/bin/env python3
"""
Polymarket Arbitrage Bot
Strategy: Buy YES + NO when combined price < $1 for guaranteed profit
Budget: $5 USDC on Polygon
Author: Nix (OpenClaw Agent)
"""

import os
import sys
import time
import json
import logging
from datetime import datetime
from decimal import Decimal, ROUND_DOWN
from dotenv import load_dotenv
from py_clob_client.client import ClobClient
from py_clob_client.clob_types import ApiCreds, OrderArgs, OrderType
import requests

# Load environment variables
load_dotenv()

# ============== CONFIGURATION ==============
class Config:
    """Bot configuration - EDIT THESE VALUES"""
    
    # Wallet & API
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    
    # Trading Settings
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'  # Set to 'false' for live trading
    MAX_TRADE_USD = 2.50  # Max $2.50 per side ($5 total)
    MIN_PROFIT_PCT = 0.005  # 0.5% minimum profit threshold
    MAX_SLIPPAGE = 0.02  # 2% max slippage
    
    # Risk Management
    MIN_BALANCE_USD = 4.00  # Stop trading if balance below $4
    MAX_DAILY_TRADES = 10  # Max 10 trades per day
    COOLDOWN_SECONDS = 300  # 5 min between trades
    
    # Market Selection
    TARGET_MARKETS = ['bitcoin', 'btc']  # Only trade BTC markets
    EXCLUDE_MARKETS = ['trump', 'election', 'politics']  # Skip volatile political markets
    
    # Polling
    POLL_INTERVAL = 30  # Check every 30 seconds
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
    
    Strategy:
    1. Find markets where YES + NO price < $1.00
    2. Buy both sides
    3. Hold to resolution for guaranteed profit
    """
    
    def __init__(self):
        self.client = None
        self.daily_trades = 0
        self.last_trade_time = 0
        self.trade_history = []
        
        # Validate config
        if not Config.PRIVATE_KEY and not Config.DRY_RUN:
            logger.error("❌ PRIVATE_KEY not set! Add to .env file or enable DRY_RUN")
            sys.exit(1)
        
        # Initialize client
        if Config.PRIVATE_KEY:
            self._init_client()
    
    def _init_client(self):
        """Initialize Polymarket CLOB client"""
        try:
            self.client = ClobClient(
                host="https://clob.polymarket.com",
                key=Config.PRIVATE_KEY,
                chain_id=137,  # Polygon
                signature_type=0,  # EOA wallet
                funder=None
            )
            
            # Create API credentials
            creds = self.client.create_or_derive_api_creds()
            self.client.set_api_creds(creds)
            
            logger.info("✅ Connected to Polymarket CLOB API")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize client: {e}")
            if not Config.DRY_RUN:
                sys.exit(1)
    
    def get_balance(self):
        """Get USDC balance"""
        if Config.DRY_RUN:
            return 5.00  # Simulated $5 balance
        
        try:
            balance = self.client.get_balance()
            return float(balance.get('balance', 0))
        except Exception as e:
            logger.error(f"❌ Failed to get balance: {e}")
            return 0.0
    
    def fetch_markets(self):
        """Fetch active markets from Polymarket Gamma API"""
        try:
            url = "https://gamma-api.polymarket.com/markets"
            params = {
                "active": "true",
                "archived": "false",
                "closed": "false",
                "limit": 100
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            markets = response.json()
            logger.debug(f"📊 Fetched {len(markets)} markets")
            return markets
            
        except Exception as e:
            logger.error(f"❌ Failed to fetch markets: {e}")
            return []
    
    def filter_target_markets(self, markets):
        """Filter for target markets (BTC, short-term)"""
        filtered = []
        
        for market in markets:
            question = market.get('question', '').lower()
            
            # Skip excluded markets
            if any(exclude in question for exclude in Config.EXCLUDE_MARKETS):
                continue
            
            # Only include target markets
            if any(target in question for target in Config.TARGET_MARKETS):
                # Check if it's a YES/NO binary market
                tokens = market.get('tokens', [])
                if len(tokens) == 2:
                    filtered.append(market)
        
        return filtered
    
    def check_arbitrage(self, market):
        """
        Check if market has arbitrage opportunity.
        
        Returns opportunity dict or None
        """
        tokens = market.get('tokens', [])
        if len(tokens) != 2:
            return None
        
        # Get prices
        yes_token = tokens[0]
        no_token = tokens[1]
        
        yes_price = float(yes_token.get('price', 0))
        no_price = float(no_token.get('price', 0))
        combined = yes_price + no_price
        
        # Check for arbitrage (combined < 1.00)
        if combined < (1.00 - Config.MIN_PROFIT_PCT):
            profit = 1.00 - combined
            profit_pct = (profit / combined) * 100 if combined > 0 else 0
            
            return {
                'market_id': market['conditionId'],
                'question': market.get('question', 'Unknown'),
                'yes_price': yes_price,
                'no_price': no_price,
                'combined': combined,
                'profit': profit,
                'profit_pct': profit_pct,
                'yes_token_id': yes_token.get('token_id'),
                'no_token_id': no_token.get('token_id'),
                'end_date': market.get('endDate')
            }
        
        return None
    
    def calculate_trade_size(self, opportunity):
        """Calculate trade sizes based on available balance"""
        balance = self.get_balance()
        
        # Risk check: Don't trade if balance too low
        if balance < Config.MIN_BALANCE_USD:
            logger.warning(f"⚠️ Balance too low: ${balance:.2f}. Stopping.")
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
        
        # Log trade details
        logger.info(f"🎯 ARBITRAGE OPPORTUNITY FOUND!")
        logger.info(f"   Market: {opportunity['question'][:60]}...")
        logger.info(f"   YES: ${opportunity['yes_price']:.4f}")
        logger.info(f"   NO:  ${opportunity['no_price']:.4f}")
        logger.info(f"   Combined: ${opportunity['combined']:.4f}")
        logger.info(f"   Profit: ${opportunity['profit']:.4f} ({opportunity['profit_pct']:.2f}%)")
        logger.info(f"   Trade Size: ${sizes['total_cost']:.2f}")
        
        if Config.DRY_RUN:
            logger.info("   [DRY RUN - No actual trade executed]")
            self._record_trade(opportunity, sizes, 'dry_run')
            return True
        
        # Execute real trades
        try:
            # Buy YES
            yes_order = self.client.create_order(
                order_type=OrderType.GTC,
                side='BUY',
                token_id=opportunity['yes_token_id'],
                size=sizes['yes_size'],
                price=opportunity['yes_price']
            )
            logger.info(f"   ✅ YES order placed: {yes_order}")
            
            # Buy NO
            no_order = self.client.create_order(
                order_type=OrderType.GTC,
                side='BUY',
                token_id=opportunity['no_token_id'],
                size=sizes['no_size'],
                price=opportunity['no_price']
            )
            logger.info(f"   ✅ NO order placed: {no_order}")
            
            self._record_trade(opportunity, sizes, 'executed')
            self.daily_trades += 1
            self.last_trade_time = time.time()
            
            return True
            
        except Exception as e:
            logger.error(f"   ❌ Trade execution failed: {e}")
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
        """Check if we're in cooldown period"""
        elapsed = time.time() - self.last_trade_time
        if elapsed < Config.COOLDOWN_SECONDS:
            remaining = Config.COOLDOWN_SECONDS - elapsed
            logger.debug(f"⏳ Cooldown: {remaining:.0f}s remaining")
            return False
        return True
    
    def run(self):
        """Main bot loop"""
        logger.info("=" * 60)
        logger.info("🦞 Polymarket Arbitrage Bot Starting")
        logger.info("=" * 60)
        logger.info(f"Mode: {'DRY RUN' if Config.DRY_RUN else 'LIVE TRADING'}")
        logger.info(f"Max Trade: ${Config.MAX_TRADE_USD} per side")
        logger.info(f"Min Profit: {Config.MIN_PROFIT_PCT * 100}%")
        logger.info(f"Cooldown: {Config.COOLDOWN_SECONDS}s")
        logger.info("=" * 60)
        
        while True:
            try:
                # Check daily trade limit
                if self.daily_trades >= Config.MAX_DAILY_TRADES:
                    logger.info("📊 Daily trade limit reached. Sleeping...")
                    time.sleep(3600)  # Sleep 1 hour
                    self.daily_trades = 0
                    continue
                
                # Check cooldown
                if not self.check_cooldown():
                    time.sleep(5)
                    continue
                
                # Get balance
                balance = self.get_balance()
                logger.info(f"💰 Balance: ${balance:.2f} USDC")
                
                # Fetch markets
                logger.info("📡 Fetching markets...")
                markets = self.fetch_markets()
                
                # Filter for target markets
                target_markets = self.filter_target_markets(markets)
                logger.info(f"🔍 Checking {len(target_markets)} BTC markets...")
                
                # Look for arbitrage opportunities
                found_opportunity = False
                for market in target_markets:
                    opportunity = self.check_arbitrage(market)
                    
                    if opportunity:
                        # Calculate trade size
                        sizes = self.calculate_trade_size(opportunity)
                        
                        if sizes:
                            # Execute trade
                            self.execute_trade(opportunity, sizes)
                            found_opportunity = True
                            break  # Only trade one opportunity per cycle
                
                if not found_opportunity:
                    logger.info("❌ No arbitrage opportunities found")
                
                # Wait before next poll
                logger.info(f"⏱️ Sleeping {Config.POLL_INTERVAL}s...")
                time.sleep(Config.POLL_INTERVAL)
                
            except KeyboardInterrupt:
                logger.info("\n🛑 Bot stopped by user")
                break
            except Exception as e:
                logger.error(f"❌ Error in main loop: {e}")
                time.sleep(Config.POLL_INTERVAL)

# ============== MAIN ==============
if __name__ == "__main__":
    bot = PolymarketArbitrageBot()
    bot.run()
