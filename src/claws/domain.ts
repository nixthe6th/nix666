/**
 * Domain Claw - Reconnaissance module for domain intelligence
 * 
 * Gathers:
 * - DNS records (A, MX, TXT, NS, CNAME)
 * - Subdomains from multiple sources
 * - Technology fingerprinting
 * - Email format detection
 */

import * as dns from 'dns';
import { promisify } from 'util';
import fetch from 'node-fetch';

const dnsLookup = promisify(dns.lookup);
const dnsResolve = promisify(dns.resolve);
const dnsResolveMx = promisify(dns.resolveMx);
const dnsResolveTxt = promisify(dns.resolveTxt);
const dnsResolveNs = promisify(dns.resolveNs);
const dnsResolveCname = promisify(dns.resolveCname);

export interface DomainReport {
  domain: string;
  timestamp: string;
  dns: DNSRecords;
  subdomains: string[];
  technologies: Technology[];
  emailFormat?: string;
  ipAddresses: string[];
  certificateInfo?: CertificateInfo;
}

export interface DNSRecords {
  a: string[];
  mx: MXRecord[];
  txt: string[];
  ns: string[];
  cname: string[];
}

export interface MXRecord {
  exchange: string;
  priority: number;
}

export interface Technology {
  name: string;
  category: string;
  confidence: number;
}

export interface CertificateInfo {
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  altNames: string[];
}

export class DomainClaw {
  private domain: string;
  private verbose: boolean;

  constructor(domain: string, verbose = false) {
    this.domain = domain.toLowerCase().trim();
    this.verbose = verbose;
  }

  async scan(): Promise<DomainReport> {
    this.log(`🔍 Scanning domain: ${this.domain}`);

    const report: DomainReport = {
      domain: this.domain,
      timestamp: new Date().toISOString(),
      dns: await this.gatherDNS(),
      subdomains: [],
      technologies: [],
      ipAddresses: [],
    };

    // Gather subdomains from multiple sources
    this.log('  📡 Gathering subdomains...');
    const [ctSubs, bruteSubs] = await Promise.all([
      this.getSubdomainsFromCertTransparency(),
      this.bruteForceSubdomains(),
    ]);
    
    report.subdomains = [...new Set([...ctSubs, ...bruteSubs])].sort();
    this.log(`  ✓ Found ${report.subdomains.length} subdomains`);

    // Technology fingerprinting
    this.log('  🔎 Fingerprinting technologies...');
    report.technologies = await this.fingerprintTechnologies();
    this.log(`  ✓ Identified ${report.technologies.length} technologies`);

    // IP addresses
    report.ipAddresses = await this.resolveIPs();

    // Email format detection
    report.emailFormat = this.detectEmailFormat();

    this.log(`✅ Domain scan complete for ${this.domain}`);
    return report;
  }

  private async gatherDNS(): Promise<DNSRecords> {
    const records: DNSRecords = {
      a: [],
      mx: [],
      txt: [],
      ns: [],
      cname: [],
    };

    // A records
    try {
      records.a = await dnsResolve(this.domain, 'A');
    } catch (e) {
      this.log('  ⚠️  No A records found');
    }

    // MX records
    try {
      const mx = await dnsResolveMx(this.domain);
      records.mx = mx.sort((a, b) => a.priority - b.priority);
    } catch (e) {
      this.log('  ⚠️  No MX records found');
    }

    // TXT records
    try {
      const txt = await dnsResolveTxt(this.domain);
      records.txt = txt.map(t => t.join(''));
    } catch (e) {
      this.log('  ⚠️  No TXT records found');
    }

    // NS records
    try {
      records.ns = await dnsResolveNs(this.domain);
    } catch (e) {
      this.log('  ⚠️  No NS records found');
    }

    // CNAME records
    try {
      records.cname = await dnsResolveCname(this.domain);
    } catch (e) {
      // CNAME not always present
    }

    return records;
  }

  private async getSubdomainsFromCertTransparency(): Promise<string[]> {
    const subdomains: Set<string> = new Set();

    try {
      // Query crt.sh for certificate transparency logs
      const response = await fetch(
        `https://crt.sh/?q=%.${this.domain}&output=json`,
        { timeout: 10000 }
      );

      if (response.ok) {
        const data = await response.json();
        for (const entry of data) {
          const name = entry.name_value.toLowerCase().trim();
          if (name.endsWith(this.domain) && name !== this.domain) {
            // Clean up wildcard certs
            const clean = name.replace(/^\*\./, '');
            subdomains.add(clean);
          }
        }
      }
    } catch (e) {
      this.log('  ⚠️  Certificate transparency lookup failed');
    }

    return Array.from(subdomains);
  }

  private async bruteForceSubdomains(): Promise<string[]> {
    const found: string[] = [];
    const commonSubdomains = [
      'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'ns2',
      'blog', 'shop', 'forum', 'admin', 'api', 'dev', 'test', 'staging',
      'mobile', 'app', 'portal', 'support', 'help', 'docs', 'cdn', 'media',
      'static', 'assets', 'img', 'images', 'css', 'js', 'vpn', 'remote',
      'webdisk', 'cpanel', 'webmin', 'panel', 'whm', 'autodiscover',
      'autoconfig', 'm', 'imap', 'pop3', 'mx', 'exchange', 'owa',
      'secure', 'login', 'auth', 'sso', 'signin', 'register', 'signup'
    ];

    // Limit to avoid rate limiting
    const toCheck = commonSubdomains.slice(0, 20);

    const checks = toCheck.map(async (sub) => {
      const fullDomain = `${sub}.${this.domain}`;
      try {
        await dnsLookup(fullDomain);
        return fullDomain;
      } catch (e) {
        return null;
      }
    });

    const results = await Promise.all(checks);
    return results.filter((r): r is string => r !== null);
  }

  private async fingerprintTechnologies(): Promise<Technology[]> {
    const techs: Technology[] = [];

    try {
      const response = await fetch(`https://${this.domain}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const headers = response.headers;
      const html = await response.text();

      // Server header
      const server = headers.get('server');
      if (server) {
        techs.push({
          name: server.split('/')[0],
          category: 'Web Server',
          confidence: 90
        });
      }

      // X-Powered-By
      const poweredBy = headers.get('x-powered-by');
      if (poweredBy) {
        techs.push({
          name: poweredBy.split('/')[0],
          category: 'Framework',
          confidence: 85
        });
      }

      // Common tech fingerprints in HTML
      if (html.includes('wp-content')) {
        techs.push({ name: 'WordPress', category: 'CMS', confidence: 95 });
      }
      if (html.includes('Drupal.settings')) {
        techs.push({ name: 'Drupal', category: 'CMS', confidence: 95 });
      }
      if (html.includes('django')) {
        techs.push({ name: 'Django', category: 'Framework', confidence: 85 });
      }
      if (html.includes('react')) {
        techs.push({ name: 'React', category: 'Frontend', confidence: 75 });
      }
      if (html.includes('vue.js') || html.includes('Vue.js')) {
        techs.push({ name: 'Vue.js', category: 'Frontend', confidence: 85 });
      }
      if (html.includes('next.js')) {
        techs.push({ name: 'Next.js', category: 'Framework', confidence: 85 });
      }

      // Cloudflare detection
      if (headers.get('cf-ray')) {
        techs.push({ name: 'Cloudflare', category: 'CDN', confidence: 100 });
      }

    } catch (e) {
      this.log('  ⚠️  Could not fetch website for fingerprinting');
    }

    return techs;
  }

  private async resolveIPs(): Promise<string[]> {
    try {
      const { address } = await dnsLookup(this.domain);
      return [address];
    } catch (e) {
      return [];
    }
  }

  private detectEmailFormat(): string | undefined {
    // Common patterns based on company size
    // This would need actual scraping to be accurate
    // For now, return common patterns
    return 'first.last@domain.com (common pattern)';
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
}

// CLI usage
if (require.main === module) {
  const domain = process.argv[2];
  if (!domain) {
    console.error('Usage: ts-node domain.ts <domain>');
    process.exit(1);
  }

  const claw = new DomainClaw(domain, true);
  claw.scan().then(report => {
    console.log('\n📊 Report:');
    console.log(JSON.stringify(report, null, 2));
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
