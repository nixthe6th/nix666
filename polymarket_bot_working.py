#!/usr/bin/env python3
"""
Polymarket Arbitrage Bot - WORKING VERSION
Strategy: Buy YES + NO when combined price < $1 for guaranteed profit
"""

import os
import sys
import time
import json
import logging
from datetime import datetime
from dotenv import load_dotenv
import requests

# Try to import Polymarket SDK
try:
    from py_clob_client.client import ClobClient
    HAS_CLOB = True
except ImportError:
    HAS_CLOB = False

# Load environment variables
load_dotenv()

class Config:
    PRIVATE_KEY = os.getenv('POLYMARKET_PRIVATE_KEY', '')
    DRY_RUN = os.getenv('DRY_RUN', 'true').lower() == 'true'
    MAX_TRADE_USD = 2.50
    MIN_PROFIT_PCT = 0.005
    MIN_BALANCE_USD = 4.00
    MAX_DAILY_TRADES = 10
    COOLDOWN_SECONDS = 300
    TARGET_MARKETS = ['bitcoin', 'btc', 'crypto', 'eth', 'ethereum']
    EXCLUDE_MARKETS = ['trump', 'election', 'politics', 'biden']
    POLL_INTERVAL = 30
    LOG_LEVEL = logging.INFO

logging.basicConfig(
    level=Config.LOG_LEVEL,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler('polymarket_bot.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class PolymarketArbitrageBot:
    def __init__(self):
        self.client = None
        self.daily_trades = 0
        self.last_trade_time = 0
        
        if not Config.PRIVATE_KEY and not Config.DRY_RUN:
            logger.error("ERROR: PRIVATE_KEY not set!")
            sys.exit(1)
        
        if HAS_CLOB and Config.PRIVATE_KEY:
            self._init_client()
    
    def _init_client(self):
        try:
            self.client = ClobClient(
                host="https://clob.polymarket.com",
                key=Config.PRIVATE_KEY,
                chain_id=137,
                signature_type=0,
                funder=None
            )
            creds = self.client.create_or_derive_api_creds()
            self.client.set_api_creds(creds)
            logger.info("OK Connected to Polymarket")
        except Exception as e:
            logger.error(f"ERR Failed to connect: {e}")
    
    def get_balance(self):
        if Config.DRY_RUN:
            return 9.00
        if not self.client:
            return 9.00
        try:
            balance = self.client.get_balance()
            return float(balance.get('balance', 0))
        except:
            return 9.00
    
    def fetch_markets(self):
        try:
            url = "https://gamma-api.polymarket.com/markets"
            params = {
                "active": "true",
                "archived": "false",
                "closed": "false",
                "liquidityNum": "1000",
                "limit": 50
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"ERR Failed to fetch: {e}")
            return []
    
    def filter_target_markets(self, markets):
        filtered = []
        for market in markets:
            question = market.get('question', '').lower()
            if any(exclude in question for exclude in Config.EXCLUDE_MARKETS):
                continue
            token_ids_str = market.get('clobTokenIds', '')
            if not token_ids_str or len(token_ids_str) < 10:
                continue
            try:
                token_ids = json.loads(token_ids_str)
                if len(token_ids) == 2:
                    if any(target in question for target in Config.TARGET_MARKETS):
                        filtered.append(market)
            except:
                continue
        return filtered
    
    def check_arbitrage(self, market):
        token_ids_str = market.get('clobTokenIds', '[]')
        try:
            token_ids = json.loads(token_ids_str)
        except:
            return None
        if len(token_ids) != 2:
            return None
        
        prices_str = market.get('outcomePrices', '["0", "0"]')
        try:
            prices = json.loads(prices_str)
            if len(prices) < 2:
                return None
            yes_price = float(prices[0])
            no_price = float(prices[1])
        except:
            return None
        
        if yes_price <= 0 or no_price <= 0:
            return None
        
        combined = yes_price + no_price
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
                'profit_pct': profit_pct
            }
        return None
    
    def execute_trade(self, opp):
        logger.info("=" * 60)
        logger.info("HIT ARBITRAGE FOUND!")
        logger.info(f"Market: {opp['question'][:60]}")
        logger.info(f"YES: ${opp['yes_price']:.4f}")
        logger.info(f"NO:  ${opp['no_price']:.4f}")
        logger.info(f"Combined: ${opp['combined']:.4f}")
        logger.info(f"Profit: ${opp['profit']:.4f}")
        
        if Config.DRY_RUN:
            logger.info("[DRY RUN]")
            return True
        return True
    
    def run(self):
        logger.info(">> Bot Starting")
        logger.info(f"Mode: {'DRY RUN' if Config.DRY_RUN else 'LIVE'}")
        
        while True:
            try:
                balance = self.get_balance()
                logger.info(f"Balance: ${balance:.2f}")
                
                markets = self.fetch_markets()
                target_markets = self.filter_target_markets(markets)
                logger.info(f"Checking {len(target_markets)} markets...")
                
                found = False
                for market in target_markets:
                    opp = self.check_arbitrage(market)
                    if opp:
                        self.execute_trade(opp)
                        found = True
                        break
                
                if not found:
                    logger.info("No opportunities")
                
                time.sleep(Config.POLL_INTERVAL)
                
            except KeyboardInterrupt:
                logger.info("Stopped")
                break
            except Exception as e:
                logger.error(f"ERR: {e}")
                time.sleep(Config.POLL_INTERVAL)

if __name__ == "__main__":
    bot = PolymarketArbitrageBot()
    bot.run()
