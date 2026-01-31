#!/usr/bin/env node
/**
 * Recon Claw CLI - The Automated Reconnaissance Engine
 * 
 * Entry point for the OSINT tool
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { DomainClaw } from './claws/domain';
import { BreachClaw } from './claws/breach';
import { AssetClaw } from './claws/asset';

const program = new Command();

program
  .name('reconclaw')
  .description('The Automated Reconnaissance Engine')
  .version('1.0.0');

// Domain Claw Command
program
  .command('scan <domain>')
  .description('Domain reconnaissance - DNS, subdomains, technologies')
  .option('-v, --verbose', 'verbose output', false)
  .option('-o, --output <file>', 'output file (JSON)')
  .action(async (domain, options) => {
    console.log(chalk.blue.bold('🕵️  Recon Claw - Domain Scanner\n'));
    
    const claw = new DomainClaw(domain, options.verbose);
    
    try {
      const report = await claw.scan();
      
      // Print summary
      console.log(chalk.green('\n✅ Scan Complete\n'));
      console.log(chalk.white(`Domain: ${report.domain}`));
      console.log(chalk.white(`IP Addresses: ${report.ipAddresses.join(', ') || 'N/A'}`));
      console.log(chalk.white(`Subdomains: ${report.subdomains.length} found`));
      console.log(chalk.white(`Technologies: ${report.technologies.map(t => t.name).join(', ') || 'N/A'}`));
      
      // DNS Records
      console.log(chalk.cyan('\n📡 DNS Records:'));
      if (report.dns.a.length) console.log(`  A: ${report.dns.a.join(', ')}`);
      if (report.dns.mx.length) console.log(`  MX: ${report.dns.mx.map(m => m.exchange).join(', ')}`);
      if (report.dns.ns.length) console.log(`  NS: ${report.dns.ns.join(', ')}`);
      
      // Subdomains
      if (report.subdomains.length > 0) {
        console.log(chalk.cyan('\n🌐 Subdomains:'));
        report.subdomains.slice(0, 10).forEach(sub => {
          console.log(`  • ${sub}`);
        });
        if (report.subdomains.length > 10) {
          console.log(chalk.gray(`  ... and ${report.subdomains.length - 10} more`));
        }
      }
      
      // Save output if requested
      if (options.output) {
        const fs = require('fs');
        fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
        console.log(chalk.green(`\n💾 Report saved to: ${options.output}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Breach Claw Command
program
  .command('breach <email>')
  .description('Check email against breach databases')
  .option('-v, --verbose', 'verbose output', false)
  .option('-k, --api-key <key>', 'HaveIBeenPwned API key')
  .option('-o, --output <file>', 'output file (JSON)')
  .action(async (email, options) => {
    console.log(chalk.blue.bold('🕵️  Recon Claw - Breach Checker\n'));
    
    const claw = new BreachClaw(email, options.apiKey, options.verbose);
    
    try {
      const report = await claw.check();
      
      // Risk color
      const riskColors = {
        low: chalk.green,
        medium: chalk.yellow,
        high: chalk.red,
        critical: chalk.bgRed.white
      };
      
      console.log(chalk.green('\n✅ Breach Check Complete\n'));
      console.log(chalk.white(`Email: ${report.email}`));
      console.log(riskColors[report.riskLevel](`Risk Level: ${report.riskLevel.toUpperCase()}`));
      console.log(chalk.white(`Breaches Found: ${report.breaches.length}`));
      console.log(chalk.white(`Pastes Found: ${report.pasteCount}`));
      
      if (report.breaches.length > 0) {
        console.log(chalk.red('\n📋 Breach Details:'));
        report.breaches.forEach(breach => {
          const date = chalk.gray(`(${breach.breachDate})`);
          const sensitive = breach.isSensitive ? chalk.red(' [SENSITIVE]') : '';
          console.log(`  • ${breach.name} ${date}${sensitive}`);
          console.log(`    ${chalk.gray(breach.dataClasses.join(', '))}`);
        });
      }
      
      if (options.output) {
        const fs = require('fs');
        fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
        console.log(chalk.green(`\n💾 Report saved to: ${options.output}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Asset Claw Command
program
  .command('asset <target>')
  .description('Network asset discovery and port scanning')
  .option('-v, --verbose', 'verbose output', false)
  .option('-p, --ports <number>', 'number of top ports to scan', '100')
  .option('--no-ping', 'skip ping sweep (for ranges)')
  .option('-o, --output <file>', 'output file (JSON)')
  .action(async (target, options) => {
    console.log(chalk.blue.bold('🕵️  Recon Claw - Asset Scanner\n'));
    
    const claw = new AssetClaw(target, options.verbose);
    
    try {
      const report = await claw.scan({
        pingSweep: options.ping,
        portScan: true,
        topPorts: parseInt(options.ports),
        fastMode: true
      });
      
      console.log(chalk.green('\n✅ Network Scan Complete\n'));
      console.log(chalk.white(`Target: ${report.target}`));
      console.log(chalk.white(`Hosts Up: ${report.summary.upHosts}/${report.summary.totalHosts}`));
      console.log(chalk.white(`Open Ports: ${report.summary.openPorts}`));
      
      report.hosts.forEach(host => {
        const status = host.status === 'up' 
          ? chalk.green('● UP') 
          : chalk.gray('○ DOWN');
        
        console.log(chalk.cyan(`\n  ${status} ${host.ip}`));
        
        if (host.ports.length > 0) {
          host.ports.forEach(port => {
            const state = port.state === 'open' 
              ? chalk.green('OPEN') 
              : chalk.gray(port.state);
            console.log(`    Port ${port.number}/${port.protocol}: ${state} (${port.service})`);
          });
        }
      });
      
      if (options.output) {
        const fs = require('fs');
        fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
        console.log(chalk.green(`\n💾 Report saved to: ${options.output}`));
      }
      
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error.message}`));
      process.exit(1);
    }
  });

// Full Recon Command (all three)
program
  .command('full <target>')
  .description('Full reconnaissance (domain + breach + asset if applicable)')
  .option('-v, --verbose', 'verbose output', false)
  .option('-o, --output <dir>', 'output directory for reports')
  .action(async (target, options) => {
    console.log(chalk.blue.bold('🕵️  Recon Claw - Full Reconnaissance\n'));
    console.log(chalk.gray(`Target: ${target}\n`));
    
    const isEmail = target.includes('@');
    const isDomain = !isEmail && !target.match(/^\d+\.\d+\.\d+\.\d+/);
    const isNetwork = target.includes('/') || target.match(/^\d+\.\d+\.\d+\.\d+/);
    
    const reports: any = {};
    
    // Domain scan
    if (isDomain) {
      console.log(chalk.cyan('📡 Running domain reconnaissance...'));
      const domainClaw = new DomainClaw(target, options.verbose);
      reports.domain = await domainClaw.scan();
    }
    
    // Breach check
    if (isEmail) {
      console.log(chalk.cyan('📡 Checking breach databases...'));
      const breachClaw = new BreachClaw(target, undefined, options.verbose);
      reports.breach = await breachClaw.check();
    }
    
    // Asset scan
    if (isNetwork) {
      console.log(chalk.cyan('📡 Scanning network assets...'));
      const assetClaw = new AssetClaw(target, options.verbose);
      reports.asset = await assetClaw.scan();
    }
    
    // Summary
    console.log(chalk.green('\n✅ Full Recon Complete\n'));
    
    if (reports.domain) {
      console.log(chalk.white(`Domain: ${reports.domain.subdomains.length} subdomains, ${reports.domain.technologies.length} technologies`));
    }
    if (reports.breach) {
      const riskColor = reports.breach.riskLevel === 'critical' ? chalk.red : 
                       reports.breach.riskLevel === 'high' ? chalk.red :
                       reports.breach.riskLevel === 'medium' ? chalk.yellow : chalk.green;
      console.log(riskColor(`Breach Risk: ${reports.breach.riskLevel.toUpperCase()} (${reports.breach.breaches.length} breaches)`));
    }
    if (reports.asset) {
      console.log(chalk.white(`Network: ${reports.asset.summary.upHosts} hosts up, ${reports.asset.summary.openPorts} open ports`));
    }
    
    // Save all reports
    if (options.output) {
      const fs = require('fs');
      const path = require('path');
      fs.mkdirSync(options.output, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.writeFileSync(
        path.join(options.output, `recon-${timestamp}.json`),
        JSON.stringify(reports, null, 2)
      );
      console.log(chalk.green(`\n💾 Reports saved to: ${options.output}`));
    }
  });

program.parse();
