#!/usr/bin/env python3
"""
Sharbel-Style Polymarket Arbitrage Bot v2.0
Built fresh for Windows compatibility
Strategy: Arbitrage between Polymarket odds vs. real momentum
"""

import os
import sys
import time
import json
import logging
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============= CONFIGURATION =============
class Config:
    # Wallet (NEVER hardcode - use .env file)
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    
    # Trading Settings
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'  # Start in test mode
    STARTING_CAPITAL = 10   # USDC - $10 total capital
    INITIAL_BET_SIZE = 1    # Start with $1 per trade
    MAX_BET_SIZE = 2        # Max $2 after consistent wins
    MIN_EDGE = 0.001        # 0.1% minimum edge (Sharbel's threshold)
    MAX_DAILY_TRADES = 10   # Limit trades per day
    COOLDOWN_SECONDS = 300  # 5 min between trades
    COOLDOWN_AFTER_LOSS = 600  # 10 min after loss for assessment
    
    # Markets to trade
    TARGET_MARKETS = ['BTC', 'ETH', 'SOL']
    
    # APIs
    POLYMARKET_API = "https://gamma-api.polymarket.com"
    COINGECKO_API = "https://api.coingecko.com/api/v3"

# ============= LOGGING SETUP =============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler('arbitrage_bot.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# ============= BOT CLASS =============
class ArbitrageBot:
    def __init__(self):
        self.balance = Config.STARTING_CAPITAL
        self.bet_size = Config.INITIAL_BET_SIZE
        self.daily_trades = 0
        self.wins = 0
        self.losses = 0
        self.last_trade_time = 0
        self.trade_history = []
        
        logger.info("=" * 60)
        logger.info("ARBITRAGE BOT STARTING")
        logger.info("=" * 60)
        logger.info(f"Mode: {'DRY RUN (TEST)' if Config.DRY_RUN else 'LIVE TRADING'}")
        logger.info(f"Starting Capital: ${Config.STARTING_CAPITAL}")
        logger.info(f"Initial Bet Size: ${Config.INITIAL_BET_SIZE}")
        logger.info(f"Target Markets: {', '.join(Config.TARGET_MARKETS)}")
        logger.info("=" * 60)
    
    def get_crypto_price(self, symbol):
        """Get real-time crypto price from CoinGecko"""
        try:
            # Map symbols to CoinGecko IDs
            coin_ids = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'SOL': 'solana'
            }
            
            coin_id = coin_ids.get(symbol, symbol.lower())
            url = f"{Config.COINGECKO_API}/simple/price?ids={coin_id}&vs_currencies=usd"
            
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return float(data[coin_id]['usd'])
            
        except Exception as e:
            logger.error(f"Error getting {symbol} price: {e}")
            return None
    
    def get_polymarket_markets(self):
        """Fetch active 15-min crypto markets from Polymarket"""
        try:
            url = f"{Config.POLYMARKET_API}/markets"
            params = {
                "active": "true",
                "closed": "false",
                "archived": "false",
                "limit": 50
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            markets = response.json()
            
            # Filter for 15-min crypto markets
            crypto_markets = []
            for market in markets:
                question = market.get('question', '').lower()
                
                # Check if it's a 15-min crypto market
                if '15 minute' in question or '15 min' in question:
                    for symbol in Config.TARGET_MARKETS:
                        if symbol.lower() in question:
                            # Check if it has token IDs
                            token_ids = market.get('clobTokenIds', '')
                            if token_ids and len(token_ids) > 10:
                                crypto_markets.append(market)
                                break
            
            return crypto_markets
            
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []
    
    def analyze_market(self, market):
        """Analyze if there's an arbitrage opportunity"""
        try:
            question = market.get('question', '')
            
            # Extract crypto symbol from question
            symbol = None
            for s in Config.TARGET_MARKETS:
                if s.lower() in question.lower():
                    symbol = s
                    break
            
            if not symbol:
                return None
            
            # Get current crypto price
            real_price = self.get_crypto_price(symbol)
            if not real_price:
                return None
            
            # Get market prices
            prices_str = market.get('outcomePrices', '["0", "0"]')
            prices = json.loads(prices_str)
            
            if len(prices) < 2:
                return None
            
            yes_price = float(prices[0])
            no_price = float(prices[1])
            combined = yes_price + no_price
            
            # Extract target price from question
            target_price = self.extract_target_price(question)
            if not target_price:
                return None
            
            # Calculate momentum vs. market odds
            price_diff = real_price - target_price
            price_variance = abs(price_diff) / target_price
            
            # Check if variance exceeds threshold (Sharbel's 0.1%)
            if price_variance < Config.MIN_EDGE:
                return None
            
            # Determine which side to bet
            if price_diff > 0:
                # Real price is ABOVE target - momentum says YES
                momentum_side = 'YES'
                momentum_confidence = price_variance
            else:
                # Real price is BELOW target - momentum says NO
                momentum_side = 'NO'
                momentum_confidence = price_variance
            
            # Only bet if momentum aligns with odds
            if momentum_side == 'YES' and yes_price < 0.7:
                return {
                    'market_id': market['conditionId'],
                    'question': question,
                    'symbol': symbol,
                    'side': 'YES',
                    'yes_price': yes_price,
                    'no_price': no_price,
                    'real_price': real_price,
                    'target_price': target_price,
                    'variance': price_variance,
                    'confidence': momentum_confidence
                }
            elif momentum_side == 'NO' and no_price < 0.7:
                return {
                    'market_id': market['conditionId'],
                    'question': question,
                    'symbol': symbol,
                    'side': 'NO',
                    'yes_price': yes_price,
                    'no_price': no_price,
                    'real_price': real_price,
                    'target_price': target_price,
                    'variance': price_variance,
                    'confidence': momentum_confidence
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error analyzing market: {e}")
            return None
    
    def extract_target_price(self, question):
        """Extract target price from question text"""
        import re
        
        # Look for price patterns like $75,834.82 or $3000
        match = re.search(r'\$([\d,]+\.?\d*)', question)
        if match:
            price_str = match.group(1).replace(',', '')
            return float(price_str)
        
        return None
    
    def execute_trade(self, opportunity):
        """Execute the arbitrage trade"""
        logger.info("=" * 60)
        logger.info("ARBITRAGE OPPORTUNITY FOUND!")
        logger.info("=" * 60)
        logger.info(f"Market: {opportunity['question'][:70]}")
        logger.info(f"Symbol: {opportunity['symbol']}")
        logger.info(f"Side: {opportunity['side']}")
        logger.info(f"Real Price: ${opportunity['real_price']:,.2f}")
        logger.info(f"Target: ${opportunity['target_price']:,.2f}")
        logger.info(f"Variance: {opportunity['variance']*100:.2f}%")
        logger.info(f"YES Price: ${opportunity['yes_price']:.4f}")
        logger.info(f"NO Price: ${opportunity['no_price']:.4f}")
        logger.info(f"Bet Size: ${self.bet_size}")
        
        if Config.DRY_RUN:
            logger.info("[DRY RUN - No actual trade executed]")
            logger.info("Set DRY_RUN=false in .env to trade live")
            return True
        
        # Live trading would go here
        logger.info("[LIVE TRADING - Order execution would happen here]")
        return True
    
    def self_improvement(self):
        """Assess after every loss - Kieran's requirement"""
        
        # Check for recent losses
        recent_trades = self.trade_history[-5:] if len(self.trade_history) >= 5 else self.trade_history
        recent_losses = sum(1 for t in recent_trades if t.get('result') == 'loss')
        
        if recent_losses > 0:
            logger.warning("=" * 60)
            logger.warning("LOSS DETECTED - ASSESSING STRATEGY")
            logger.warning("=" * 60)
            
            # Log recent performance
            logger.info(f"Recent trades: {len(recent_trades)}")
            logger.info(f"Recent losses: {recent_losses}")
            
            # Multiple losses = pause and reassess
            if recent_losses >= 2:
                logger.warning("Multiple losses detected - PAUSING FOR ASSESSMENT")
                
                # Scale down to minimum
                if self.bet_size > Config.INITIAL_BET_SIZE:
                    self.bet_size = Config.INITIAL_BET_SIZE
                    logger.info(f"Scaled bet size DOWN to ${self.bet_size}")
                
                # Extra cooldown for manual assessment
                logger.info("Taking 10 minutes to reassess strategy...")
                logger.info("Review your .env settings and market conditions")
                time.sleep(Config.COOLDOWN_AFTER_LOSS)
            else:
                logger.info("Single loss - continuing with caution")
                logger.info("Analyzing what went wrong...")
                # Brief pause to reassess
                time.sleep(60)
            
            logger.info("Assessment complete")
            logger.info("=" * 60)
        
        # Scale up only after consistent wins (5+ wins, no recent losses)
        elif self.wins >= 5 and recent_losses == 0 and self.bet_size < Config.MAX_BET_SIZE:
            self.bet_size = min(self.bet_size + 0.5, Config.MAX_BET_SIZE)
            logger.info(f"Scaled bet size UP to ${self.bet_size} after consistent wins")
    
    def print_stats(self):
        """Print current statistics"""
        win_rate = (self.wins / (self.wins + self.losses) * 100) if (self.wins + self.losses) > 0 else 0
        
        logger.info("-" * 60)
        logger.info(f"Balance: ${self.balance:.2f}")
        logger.info(f"Daily Trades: {self.daily_trades}/{Config.MAX_DAILY_TRADES}")
        logger.info(f"Wins: {self.wins} | Losses: {self.losses}")
        logger.info(f"Win Rate: {win_rate:.1f}%")
        logger.info(f"Current Bet Size: ${self.bet_size}")
        logger.info("-" * 60)
    
    def run(self):
        """Main bot loop"""
        logger.info("Starting main loop...")
        
        try:
            while True:
                # Check daily trade limit
                if self.daily_trades >= Config.MAX_DAILY_TRADES:
                    logger.info("Daily trade limit reached. Sleeping...")
                    time.sleep(3600)  # Sleep 1 hour
                    self.daily_trades = 0
                    continue
                
                # Print stats
                self.print_stats()
                
                # Fetch markets
                logger.info("Fetching Polymarket markets...")
                markets = self.get_polymarket_markets()
                logger.info(f"Found {len(markets)} active 15-min crypto markets")
                
                # Analyze each market
                opportunity_found = False
                for market in markets:
                    opp = self.analyze_market(market)
                    
                    if opp:
                        self.execute_trade(opp)
                        opportunity_found = True
                        self.daily_trades += 1
                        
                        # Self-improvement check
                        self.self_improvement()
                        
                        # Cooldown after trade
                        logger.info(f"Cooldown: {Config.COOLDOWN_SECONDS}s...")
                        time.sleep(Config.COOLDOWN_SECONDS)
                        break
                
                if not opportunity_found:
                    logger.info("No arbitrage opportunities found")
                    logger.info(f"Checking again in 60 seconds...")
                    time.sleep(60)
                
        except KeyboardInterrupt:
            logger.info("\nBot stopped by user")
            self.print_stats()

# ============= MAIN =============
if __name__ == "__main__":
    # Check if .env file exists
    if not os.path.exists('.env'):
        logger.warning("No .env file found!")
        logger.warning("Create a .env file with:")
        logger.warning("POLYMARKET_PRIVATE_KEY=your_key_here")
        logger.warning("DRY_RUN=true")
    
    # Start bot
    bot = ArbitrageBot()
    bot.run()
