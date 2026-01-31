#!/bin/bash
# OpenClaw Automation Engine - Installation Script

set -e

echo "⚡ OpenClaw Automation Engine - Installer"
echo "========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "16" ]; then
    echo "❌ Node.js 16+ required. Found: $(node --version)"
    exit 1
fi

echo "✓ Node.js $(node --version)"

# Check ffmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  ffmpeg not found (optional, needed for video processing)"
    echo "   Install: sudo apt install ffmpeg (Ubuntu/Debian)"
    echo "            brew install ffmpeg (macOS)"
else
    echo "✓ ffmpeg $(ffmpeg -version | head -1 | cut -d' ' -f3)"
fi

echo ""
echo "📦 Installing OpenClaw..."

# Create config directory
mkdir -p ~/.openclaw
touch ~/.openclaw/config.json

# Create bin directory
mkdir -p ~/.local/bin

# Create wrapper script
cat > ~/.local/bin/openclaw << 'WRAPPER'
#!/bin/bash
# OpenClaw CLI wrapper

OPENCLAW_DIR="${OPENCLAW_DIR:-$(dirname $(dirname $(readlink -f $0)))}"

if [ ! -d "$OPENCLAW_DIR" ]; then
    echo "Error: OpenClaw not found at $OPENCLAW_DIR"
    echo "Set OPENCLAW_DIR environment variable or reinstall"
    exit 1
fi

node "$OPENCLAW_DIR/cli.js" "$@"
WRAPPER

chmod +x ~/.local/bin/openclaw

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "⚠️  ~/.local/bin is not in your PATH"
    echo "   Add this to your ~/.bashrc or ~/.zshrc:"
    echo '   export PATH="$PATH:$HOME/.local/bin"'
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Add API key: openclaw config set moonshot_api_key YOUR_KEY"
echo "2. Try a skill: openclaw run content/youtube-prep --help"
echo "3. Set up watcher: openclaw watch ~/Videos --skill content/youtube-prep"
echo ""
echo "Documentation: https://github.com/nixthe6th/nix666"
echo ""
