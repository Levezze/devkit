#!/bin/bash
# Complete Setup Script
# Runs bootstrap + devkit installer

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}  ╭──────────────────────────────────────╮${NC}"
echo -e "${CYAN}  │${BOLD}   Complete Setup                     ${NC}${CYAN}│${NC}"
echo -e "${CYAN}  │   Bootstrap + Devkit Config           │${NC}"
echo -e "${CYAN}  ╰──────────────────────────────────────╯${NC}"
echo ""

# Set flag so bootstrap knows not to prompt for Claude installer
export RUNNING_FROM_SETUP=1

# Run bootstrap
"$SCRIPT_DIR/bootstrap.sh"

# After bootstrap, Node should be installed
# Source nvm if it exists (in case it was just installed)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Run devkit installer
if command -v node &> /dev/null; then
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo -e "${BOLD}Running devkit installer...${NC}"
  echo ""

  cd "$SCRIPT_DIR"
  npm install --silent 2>/dev/null || npm install
  node install.js

  echo ""
  echo -e "${GREEN}${BOLD}Complete setup finished!${NC}"
  echo ""
else
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo "Node.js not found. Skipping devkit installer."
  echo "Run 'node install.js' manually after installing Node."
  echo ""
fi
