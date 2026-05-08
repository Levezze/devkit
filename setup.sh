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

echo ""
echo -e "${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}Complete setup finished!${NC}"
echo ""
