#!/usr/bin/env node
/**
 * apicheck - Quick API health checker
 * Usage: node apicheck.js [service]
 * Services: github, openclaw, telegram, fiverr, all
 */

const SERVICES = {
  github: {
    url: 'https://api.github.com/status',
    name: 'GitHub API',
    check: (res) => res.status === 200
  },
  telegram: {
    url: 'https://api.telegram.org/bot123456:ABC/getMe',
    name: 'Telegram API',
    check: (res) => res.status === 401 // Bot not found = API is up
  },
  openclaw: {
    url: 'https://api.openclaw.ai/status',
    name: 'OpenClaw API',
    check: (res) => res.status < 500
  },
  fiverr: {
    url: 'https://www.fiverr.com',
    name: 'Fiverr',
    check: (res) => res.status === 200
  }
};

async function checkService(key) {
  const svc = SERVICES[key];
  if (!svc) return null;
  
  const start = Date.now();
  try {
    const res = await fetch(svc.url, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    const latency = Date.now() - start;
    const status = svc.check(res) ? '✅ UP' : '❌ DOWN';
    return { name: svc.name, status, latency: `${latency}ms` };
  } catch (err) {
    return { name: svc.name, status: '❌ ERROR', latency: err.message };
  }
}

async function main() {
  const target = process.argv[2] || 'all';
  const keys = target === 'all' ? Object.keys(SERVICES) : [target];
  
  console.log('⚡ API Health Check\n');
  
  for (const key of keys) {
    const result = await checkService(key);
    if (result) {
      console.log(`${result.status} ${result.name} (${result.latency})`);
    } else {
      console.log(`❌ Unknown service: ${key}`);
      console.log(`Available: ${Object.keys(SERVICES).join(', ')}`);
    }
  }
}

main();
