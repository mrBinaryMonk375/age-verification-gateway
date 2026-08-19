# Age Verification Gateway — Setup Script
# This script helps you get started quickly

set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     Age Verification Gateway - Quick Setup           ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install via NVM: https://github.com/nvm-sh/nvm"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 22 ]; then
  echo "❌ Node.js 22+ required (found $(node -v)). Run: nvm use 22"
  exit 1
fi
echo "✅ Node.js $(node -v)"

if ! command -v compact &> /dev/null && ! [ -f ~/.local/bin/compact ]; then
  echo "❌ compact not found. Install from: https://docs.midnight.network"
  exit 1
fi

COMPACT_CMD="compact"
[ -f ~/.local/bin/compact ] && COMPACT_CMD="$HOME/.local/bin/compact"
echo "✅ compact ($($COMPACT_CMD --version 2>&1 | head -1))"

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Compiling Compact contract..."
cd contract
$COMPACT_CMD compile src/age_gate.compact ./src/managed/age-gate
cd ..
echo "✅ Contract compiled"

echo ""
echo "Running tests..."
cd contract
npx vitest run --reporter=verbose
cd ..
echo "✅ All tests passed"

echo ""
echo "Setting up frontend..."
cd bboard-ui
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created bboard-ui/.env from .env.example"
else
  echo "ℹ️  bboard-ui/.env already exists, skipping"
fi
cd ..

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║              Setup Complete!                         ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  Next steps:                                         ║"
echo "║  1. npm run cli        (requires Docker)             ║"
echo "║     → Enter your birth year (private)                ║"
echo "║     → Note the contract address                      ║"
echo "║                                                      ║"
echo "║  2. Edit bboard-ui/.env:                             ║"
echo "║     VITE_CONTRACT_ADDRESS=<from step 1>              ║"
echo "║                                                      ║"
echo "║  3. cd bboard-ui && npm run dev                      ║"
echo "║     → Open http://localhost:5173                     ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
