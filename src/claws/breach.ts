/**
 * Breach Claw - Check email addresses against breach databases
 * 
 * Uses HaveIBeenPwned API and other sources to find compromised credentials
 */

import fetch from 'node-fetch';

export interface BreachReport {
  email: string;
  scannedAt: string;
  breaches: Breach[];
  pasteCount: number;
  totalExposures: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface Breach {
  name: string;
  title: string;
  domain: string;
  breachDate: string;
  addedDate: string;
  modifiedDate: string;
  pwnCount: number;
  description: string;
  dataClasses: string[];
  isVerified: boolean;
  isFabricated: boolean;
  isSensitive: boolean;
  isRetired: boolean;
  isSpamList: boolean;
  logoPath: string;
}

export interface Paste {
  id: string;
  source: string;
  title: string;
  date: string;
  emailCount: number;
}

export class BreachClaw {
  private email: string;
  private apiKey?: string;
  private verbose: boolean;

  constructor(email: string, apiKey?: string, verbose = false) {
    this.email = email.toLowerCase().trim();
    this.apiKey = apiKey;
    this.verbose = verbose;
  }

  async check(): Promise<BreachReport> {
    this.log(`🔍 Checking breaches for: ${this.email}`);

    const report: BreachReport = {
      email: this.email,
      scannedAt: new Date().toISOString(),
      breaches: [],
      pasteCount: 0,
      totalExposures: 0,
      riskLevel: 'low'
    };

    // Check HaveIBeenPwned
    try {
      this.log('  📡 Querying HaveIBeenPwned...');
      const breaches = await this.queryHIBP();
      report.breaches = breaches;
      report.totalExposures = breaches.length;
      this.log(`  ✓ Found ${breaches.length} breaches`);
    } catch (e) {
      this.log('  ⚠️  HIBP query failed (rate limit or no breaches)');
    }

    // Check pastes
    try {
      this.log('  📡 Checking paste sites...');
      const pastes = await this.queryPastes();
      report.pasteCount = pastes.length;
      this.log(`  ✓ Found ${pastes.length} pastes`);
    } catch (e) {
      this.log('  ⚠️  Paste check failed');
    }

    // Calculate risk level
    report.riskLevel = this.calculateRisk(report);

    this.log(`✅ Breach check complete`);
    return report;
  }

  private async queryHIBP(): Promise<Breach[]> {
    const headers: Record<string, string> = {
      'User-Agent': 'ReconClaw-OSINT-Tool',
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['hibp-api-key'] = this.apiKey;
    }

    const response = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(this.email)}`,
      { headers, timeout: 10000 }
    );

    if (response.status === 404) {
      // No breaches found
      return [];
    }

    if (!response.ok) {
      throw new Error(`HIBP API error: ${response.status}`);
    }

    return await response.json() as Breach[];
  }

  private async queryPastes(): Promise<Paste[]> {
    const headers: Record<string, string> = {
      'User-Agent': 'ReconClaw-OSINT-Tool',
      'Accept': 'application/json'
    };

    if (this.apiKey) {
      headers['hibp-api-key'] = this.apiKey;
    }

    const response = await fetch(
      `https://haveibeenpwned.com/api/v3/pasteaccount/${encodeURIComponent(this.email)}`,
      { headers, timeout: 10000 }
    );

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new Error(`HIBP Paste API error: ${response.status}`);
    }

    return await response.json() as Paste[];
  }

  private calculateRisk(report: BreachReport): 'low' | 'medium' | 'high' | 'critical' {
    const breachCount = report.breaches.length;
    const sensitiveBreaches = report.breaches.filter(b => 
      b.isSensitive || b.dataClasses.includes('Passwords')
    ).length;

    if (breachCount === 0) return 'low';
    if (sensitiveBreaches > 2 || breachCount > 5) return 'critical';
    if (sensitiveBreaches > 0 || breachCount > 2) return 'high';
    return 'medium';
  }

  static async checkDomain(domain: string): Promise<string[]> {
    // Get all breached domains from HIBP
    try {
      const response = await fetch('https://haveibeenpwned.com/api/v3/breaches', {
        headers: { 'User-Agent': 'ReconClaw-OSINT-Tool' },
        timeout: 10000
      });

      if (!response.ok) return [];

      const breaches = await response.json() as Breach[];
      const domainBreaches = breaches.filter(b => 
        b.domain.toLowerCase() === domain.toLowerCase()
      );

      return domainBreaches.map(b => b.name);
    } catch (e) {
      return [];
    }
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
}

// CLI usage
if (require.main === module) {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: ts-node breach.ts <email>');
    process.exit(1);
  }

  const claw = new BreachClaw(email, process.env.HIBP_API_KEY, true);
  claw.check().then(report => {
    console.log('\n📊 Breach Report:');
    console.log(`Email: ${report.email}`);
    console.log(`Risk Level: ${report.riskLevel.toUpperCase()}`);
    console.log(`Breaches: ${report.breaches.length}`);
    console.log(`Pastes: ${report.pasteCount}`);
    
    if (report.breaches.length > 0) {
      console.log('\n📋 Breach Details:');
      report.breaches.forEach(b => {
        console.log(`  • ${b.name} (${b.breachDate}) - ${b.pwnCount.toLocaleString()} accounts`);
        console.log(`    Data: ${b.dataClasses.join(', ')}`);
      });
    }
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
