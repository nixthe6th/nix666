/**
 * Asset Claw - Network discovery and port scanning
 * 
 * Discovers hosts and services on a network
 * Lightweight wrapper for common network reconnaissance
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';

export interface NetworkReport {
  target: string;
  scannedAt: string;
  hosts: Host[];
  summary: {
    totalHosts: number;
    upHosts: number;
    totalPorts: number;
    openPorts: number;
  };
}

export interface Host {
  ip: string;
  status: 'up' | 'down';
  hostname?: string;
  ports: Port[];
  os?: OSGuess;
  latency?: number;
}

export interface Port {
  number: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service?: string;
  version?: string;
}

export interface OSGuess {
  name: string;
  confidence: number;
}

export class AssetClaw {
  private target: string;
  private verbose: boolean;
  private timeout: number;

  constructor(target: string, verbose = false, timeout = 5000) {
    this.target = target;
    this.verbose = verbose;
    this.timeout = timeout;
  }

  async scan(options: ScanOptions = {}): Promise<NetworkReport> {
    const { 
      pingSweep = true, 
      portScan = true, 
      topPorts = 100,
      fastMode = true 
    } = options;

    this.log(`🔍 Scanning network: ${this.target}`);

    const report: NetworkReport = {
      target: this.target,
      scannedAt: new Date().toISOString(),
      hosts: [],
      summary: {
        totalHosts: 0,
        upHosts: 0,
        totalPorts: 0,
        openPorts: 0
      }
    };

    // Determine if single host or network range
    const isRange = this.target.includes('/');

    if (isRange) {
      // Network range scan
      this.log('  🌐 Network range detected');
      
      if (pingSweep) {
        this.log('  📡 Running ping sweep...');
        report.hosts = await this.pingSweep();
        this.log(`  ✓ Found ${report.hosts.filter(h => h.status === 'up').length} live hosts`);
      }
    } else {
      // Single host scan
      this.log('  🖥️  Single host scan');
      const host: Host = {
        ip: this.target,
        status: 'up',
        ports: []
      };

      // Check if host is up
      const isUp = await this.isHostUp(this.target);
      host.status = isUp ? 'up' : 'down';

      if (isUp && portScan) {
        this.log('  🔎 Scanning ports...');
        host.ports = await this.scanPorts(this.target, topPorts, fastMode);
        this.log(`  ✓ Found ${host.ports.filter(p => p.state === 'open').length} open ports`);
      }

      report.hosts = [host];
    }

    // Calculate summary
    report.summary.totalHosts = report.hosts.length;
    report.summary.upHosts = report.hosts.filter(h => h.status === 'up').length;
    report.summary.totalPorts = report.hosts.reduce((acc, h) => acc + h.ports.length, 0);
    report.summary.openPorts = report.hosts.reduce(
      (acc, h) => acc + h.ports.filter(p => p.state === 'open').length, 
      0
    );

    this.log(`✅ Network scan complete`);
    return report;
  }

  private async pingSweep(): Promise<Host[]> {
    const hosts: Host[] = [];
    
    // Parse CIDR notation (e.g., 192.168.1.0/24)
    const [baseIp, cidr] = this.target.split('/');
    const mask = parseInt(cidr);
    const hostCount = Math.pow(2, 32 - mask) - 2; // -2 for network and broadcast

    // Limit to avoid abuse
    if (hostCount > 254) {
      this.log('  ⚠️  Large network detected, limiting to first 50 hosts');
    }

    const ips = this.generateIPs(baseIp, Math.min(hostCount, 50));

    // Ping hosts in parallel with limit
    const batchSize = 10;
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(ip => this.pingHost(ip))
      );
      hosts.push(...results.filter((h): h is Host => h !== null));
    }

    return hosts;
  }

  private async pingHost(ip: string): Promise<Host | null> {
    return new Promise((resolve) => {
      const start = Date.now();
      
      // Try TCP connect to port 80 (faster than ICMP ping)
      const socket = new net.Socket();
      socket.setTimeout(2000);
      
      socket.on('connect', () => {
        const latency = Date.now() - start;
        socket.destroy();
        resolve({
          ip,
          status: 'up',
          ports: [{ number: 80, protocol: 'tcp', state: 'open' }],
          latency
        });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.connect(80, ip);
    });
  }

  private async isHostUp(ip: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      // Try common ports
      const ports = [80, 443, 22, 3389];
      let attempts = 0;
      
      const tryPort = () => {
        if (attempts >= ports.length) {
          resolve(false);
          return;
        }
        socket.connect(ports[attempts], ip);
        attempts++;
      };
      
      socket.on('error', tryPort);
      tryPort();
    });
  }

  private async scanPorts(ip: string, topPorts: number, fastMode: boolean): Promise<Port[]> {
    const ports: Port[] = [];
    
    // Common ports to scan
    const commonPorts = [
      21, 22, 23, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995,
      1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 9200
    ];

    const portsToScan = fastMode ? commonPorts.slice(0, topPorts) : commonPorts;

    // Scan in parallel with limit
    const batchSize = 10;
    for (let i = 0; i < portsToScan.length; i += batchSize) {
      const batch = portsToScan.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(port => this.scanPort(ip, port))
      );
      ports.push(...results.filter((p): p is Port => p !== null));
    }

    return ports;
  }

  private async scanPort(ip: string, port: number): Promise<Port | null> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(this.timeout);
      
      socket.on('connect', () => {
        const service = this.identifyService(port);
        socket.destroy();
        resolve({
          number: port,
          protocol: 'tcp',
          state: 'open',
          service
        });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.connect(port, ip);
    });
  }

  private identifyService(port: number): string {
    const services: Record<number, string> = {
      21: 'ftp', 22: 'ssh', 23: 'telnet', 25: 'smtp',
      53: 'dns', 80: 'http', 110: 'pop3', 143: 'imap',
      443: 'https', 465: 'smtps', 587: 'submission',
      993: 'imaps', 995: 'pop3s', 1433: 'mssql',
      1521: 'oracle', 3306: 'mysql', 3389: 'rdp',
      5432: 'postgresql', 5900: 'vnc', 6379: 'redis',
      8080: 'http-proxy', 8443: 'https-alt', 9200: 'elasticsearch'
    };
    return services[port] || 'unknown';
  }

  private generateIPs(baseIp: string, count: number): string[] {
    const parts = baseIp.split('.').map(Number);
    const ips: string[] = [];
    
    for (let i = 1; i <= count && i < 255; i++) {
      parts[3] = i;
      ips.push(parts.join('.'));
    }
    
    return ips;
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
}

export interface ScanOptions {
  pingSweep?: boolean;
  portScan?: boolean;
  topPorts?: number;
  fastMode?: boolean;
}

// CLI usage
if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: ts-node asset.ts <target>');
    console.error('Examples:');
    console.error('  ts-node asset.ts 192.168.1.1');
    console.error('  ts-node asset.ts 192.168.1.0/24');
    process.exit(1);
  }

  const claw = new AssetClaw(target, true);
  claw.scan({ pingSweep: target.includes('/'), topPorts: 20 }).then(report => {
    console.log('\n📊 Network Report:');
    console.log(`Target: ${report.target}`);
    console.log(`Hosts Up: ${report.summary.upHosts}/${report.summary.totalHosts}`);
    console.log(`Open Ports: ${report.summary.openPorts}`);
    
    report.hosts.forEach(host => {
      console.log(`\n  🖥️  ${host.ip} (${host.status})`);
      if (host.ports.length > 0) {
        console.log('     Ports:');
        host.ports.forEach(port => {
          console.log(`       ${port.number}/${port.protocol} - ${port.service} (${port.state})`);
        });
      }
    });
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
