# Recon Claw 🕵️

> *The Automated Reconnaissance Engine*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Turn 4 hours of manual research into a 30-second report.**

OpenClaw OSINT tool for security professionals, investigators, and researchers. Automatically maps digital footprints from domains, emails, and networks.

## 🎯 The Problem

Security analysts spend **80% of their time** manually:
- Visiting websites
- Checking IP addresses  
- Scraping profiles
- Gathering data on targets

## 💡 The Solution

```bash
reconclaw scan example.com
# 30 seconds later: comprehensive report
```

**The Claws:**
- 🌐 **Domain Claw** — Subdomains, DNS records, server tech
- 📧 **Breach Claw** — Email breach checks (HaveIBeenPwned)
- 🖥️ **Asset Claw** — Network scanning, device discovery

## 🚀 Quick Start

```bash
# Install
git clone https://github.com/nixthe6th/nix666.git reconclaw
cd reconclaw
npm install
npm run build

# Scan a target
./bin/reconclaw scan example.com

# Check email for breaches
./bin/reconclaw breach check user@example.com

# Scan network
./bin/reconclaw asset scan 192.168.1.0/24
```

## 🛠️ The Three Claws

### 1. Domain Claw (`reconclaw scan <domain>`)

**Input:** `example.com`

**Output:**
```json
{
  "domain": "example.com",
  "dns": {
    "a": ["93.184.216.34"],
    "mx": ["mail.example.com"],
    "txt": ["v=spf1..."]
  },
  "subdomains": [
    "www.example.com",
    "mail.example.com",
    "api.example.com"
  ],
  "technologies": ["nginx", "PHP", "WordPress"],
  "email_format": "first.last@example.com"
}
```

**Sources:**
- DNS enumeration (A, MX, TXT, NS records)
- Certificate Transparency logs
- Subdomain brute force (common list)
- Technology fingerprinting (Wappalyzer-style)

### 2. Breach Claw (`reconclaw breach <email>`)

**Input:** `user@example.com`

**Output:**
```json
{
  "email": "user@example.com",
  "breaches": [
    {
      "name": "LinkedIn 2012",
      "date": "2012-05-05",
      "records": 164M,
      "data_types": ["email", "password"]
    }
  ],
  "exposed_count": 3
}
```

**Sources:**
- HaveIBeenPwned API
- DeHashed (optional)
- Public breach databases

### 3. Asset Claw (`reconclaw asset <network>`)

**Input:** `192.168.1.0/24`

**Output:**
```json
{
  "network": "192.168.1.0/24",
  "hosts": [
    {
      "ip": "192.168.1.1",
      "status": "up",
      "ports": [80, 443, 22],
      "services": ["http", "https", "ssh"],
      "os_guess": "Linux"
    }
  ]
}
```

**Features:**
- Host discovery (ping sweep)
- Port scanning (top 1000)
- Service fingerprinting
- OS detection (basic)

## 💰 Money Model

**Free Tier (Open Source):**
- All CLI tools
- Raw JSON/TXT output
- Community support

**Pro Tier — Reporter Module:**
```bash
reconclaw scan example.com --report
# Generates beautiful, branded PDF report
```

**Pricing:**
- $19 one-time license
- Or $9/month subscription
- White-label options for firms

**Why Pay?**
- Professional PDF reports
- Custom branding
- Scheduled scans
- API access
- Priority support

## 🏗️ Architecture

```
src/
├── claws/           # Core modules
│   ├── domain.ts    # Domain reconnaissance
│   ├── breach.ts    # Breach checking
│   └── asset.ts     # Network scanning
├── utils/           # Helpers
│   ├── dns.ts
│   ├── http.ts
│   └── parser.ts
├── reporter/        # PDF generation (Pro)
│   └── pdf.ts
└── cli.ts           # Entry point
```

## 🎯 Target Customers

- **Junior Pen-Testers** — Learning reconnaissance
- **Boutique Security Firms** — Small team, big clients
- **IT Consultants** — Network audits for SMBs
- **Private Investigators** — Digital footprint mapping
- **Bug Bounty Hunters** — Quick target recon

## 🛡️ Safety & Ethics

- **Read-Only:** Never exploits, only observes
- **Public Data:** Uses only publicly available information
- **Responsible Disclosure:** Built-in guidelines
- **Audit Trail:** All scans logged for compliance

## 🤝 Contributing

OSINT is community-driven. Add new data sources:

1. Fork repo
2. Add source in `src/sources/`
3. Test thoroughly
4. Document in README
5. Submit PR

## 📜 License

MIT License — see LICENSE

---

*Built by Nix, claimed by Kieran. For the security community.* 🕵️⚡
