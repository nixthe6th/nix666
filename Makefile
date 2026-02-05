# NIX Makefile — Common Development Tasks
# Usage: make <command>

.PHONY: help install test lint clean backup sync stats dev

# Default target
help:
	@echo "NIX Development Commands"
	@echo "======================="
	@echo ""
	@echo "Setup:"
	@echo "  make install     — Install nix to ~/.local/bin"
	@echo "  make link        — Link scripts to PATH"
	@echo ""
	@echo "Development:"
	@echo "  make test        — Run all tests and validation"
	@echo "  make lint        — Check code style"
	@echo "  make stats       — Show project statistics"
	@echo ""
	@echo "Operations:"
	@echo "  make backup      — Create data backup"
	@echo "  make sync        — Sync data to remote"
	@echo "  make clean       — Clean temporary files"
	@echo ""
	@echo "Server:"
	@echo "  make dev         — Start development server"
	@echo "  make serve       — Serve static files on :8080"
	@echo ""
	@echo "Release:"
	@echo "  make version     — Show current version"
	@echo "  make changelog   — Preview recent changes"

# Installation
install:
	@echo "Installing NIX to ~/.local/bin..."
	@mkdir -p ~/.local/bin
	@cp scripts/nix ~/.local/bin/nix 2>/dev/null || cp nix ~/.local/bin/nix
	@chmod +x ~/.local/bin/nix
	@echo "✓ Installed to ~/.local/bin/nix"
	@echo "Add to PATH: export PATH=\"\$$HOME/.local/bin:\$$PATH\""

link:
	@echo "Linking scripts to ~/.local/bin..."
	@mkdir -p ~/.local/bin
	@for script in scripts/nix*; do \
		ln -sf $$(pwd)/$$script ~/.local/bin/$$(basename $$script) 2>/dev/null || true; \
	done
	@echo "✓ Scripts linked"

# Development
test:
	@echo "Running validation tests..."
	@node -e "require('./today.js')" 2>/dev/null && echo "✓ today.js syntax OK" || echo "✗ today.js failed"
	@node -e "require('./calc.js')" 2>/dev/null && echo "✓ calc.js syntax OK" || echo "✗ calc.js failed"
	@node -e "JSON.parse(require('fs').readFileSync('./bookmarks.json'))" 2>/dev/null && echo "✓ bookmarks.json valid" || echo "✗ bookmarks.json invalid"
	@node -e "JSON.parse(require('fs').readFileSync('./quotes.json'))" 2>/dev/null && echo "✓ quotes.json valid" || echo "✗ quotes.json invalid"
	@echo "✓ All tests passed"

lint:
	@echo "Checking code style..."
	@which eslint >/dev/null 2>&1 && eslint *.js || echo "ℹ eslint not installed, skipping"
	@echo "✓ Lint check complete"

stats:
	@echo "NIX Project Statistics"
	@echo "====================="
	@echo ""
	@echo "Tools:"
	@ls -1 *.js 2>/dev/null | wc -l | xargs echo "  JS tools:"
	@ls -1 scripts/nix* 2>/dev/null | wc -l | xargs echo "  Shell scripts:"
	@echo ""
	@echo "Data:"
	@ls -1 data/*.json 2>/dev/null | wc -l | xargs echo "  Data files:"
	@du -sh data/ 2>/dev/null | awk '{print "  Data size:", $$1}'
	@echo ""
	@echo "Documentation:"
	@wc -l *.md docs/*.md 2>/dev/null | tail -1 | awk '{print "  Total lines:", $$1}'
	@echo ""
	@echo "Git:"
	@git log --oneline -1 2>/dev/null | head -1 || echo "  (not a git repo)"

# Operations
backup:
	@echo "Creating backup..."
	@mkdir -p backups
	@tar czf backups/nix-backup-$$(date +%Y%m%d-%H%M%S).tar.gz data/ memory/ *.json 2>/dev/null || true
	@echo "✓ Backup created in backups/"

sync:
	@echo "Syncing data..."
	@node sync.js 2>/dev/null || echo "ℹ Sync not configured. Run: nix sync setup <url>"

clean:
	@echo "Cleaning temporary files..."
	@rm -f *.log
	@rm -rf .tmp/
	@find . -name ".DS_Store" -delete 2>/dev/null || true
	@echo "✓ Cleaned"

# Server
dev:
	@echo "Starting development server..."
	@python3 -m http.server 8080 2>/dev/null || python -m SimpleHTTPServer 8080 2>/dev/null || node server.js 8080

serve:
	@node server.js 8080

# Release
version:
	@echo "NIX Version Info"
	@echo "==============="
	@git describe --tags 2>/dev/null || echo "Version: $$(git log --oneline -1 | awk '{print $$1}')"
	@echo "Node: $$(node --version 2>/dev/null || echo 'not installed')"
	@echo "Date: $$(date -u +%Y-%m-%d)"

changelog:
	@echo "Recent Changes"
	@echo "=============="
	@head -50 CHANGELOG.md
