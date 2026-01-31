# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < main  | :x:                |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability within nix666, please follow these steps:

1. **Do not** open a public issue
2. Email security concerns to: nixthe6th@proton.me
3. Include detailed steps to reproduce the issue
4. Allow up to 48 hours for initial response
5. We'll work with you to verify and patch the issue

## Security Considerations

### Data Storage
- All data is stored locally in `data/` directory as JSON files
- No data is sent to external servers (except optional GitHub Gist sync)
- Encryption is optional but recommended for cloud sync

### GitHub Token Storage
When using `nix sync`:
- Tokens can be stored in `NIX_GITHUB_TOKEN` environment variable (recommended)
- Alternatively stored in `data/.sync.json` (ensure proper file permissions)
- Token requires only `gist` scope
- Gists are created as private by default

### Best Practices
1. Regular backups using `nix sync backup --encrypt`
2. Keep your GitHub token secure
3. Review data file permissions (should be user-readable only)
4. Don't commit sensitive data to git

## Known Limitations

- Data files are plaintext JSON (not encrypted at rest locally)
- No built-in password management (use a password manager)
- Self-hosted with no central security updates
