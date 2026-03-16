#!/bin/bash
# Machine Bootstrap Script
# Sets up a brand new machine with dev tools

set -e

# ============================================================================
# Colors and formatting (no dependencies)
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ============================================================================
# Utility functions
# ============================================================================
print_header() {
  echo ""
  echo -e "${CYAN}  ╭──────────────────────────────────────╮${NC}"
  echo -e "${CYAN}  │${BOLD}   Machine Bootstrap                  ${NC}${CYAN}│${NC}"
  echo -e "${CYAN}  ╰──────────────────────────────────────╯${NC}"
  echo ""
}

print_step() {
  local step=$1
  local total=$2
  local name=$3
  echo ""
  echo -e "${CYAN}[$step/$total]${NC} ${BOLD}$name${NC}"
}

print_success() {
  echo -e "  ${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "  ${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "  ${RED}✗${NC} $1"
}

print_info() {
  echo -e "  ${BLUE}→${NC} $1"
}

# ============================================================================
# Overwrite handling
# ============================================================================
OVERWRITE_STRATEGY=""  # "", "all", "none"

# Returns 0 if should install, 1 if should skip
prompt_existing() {
  local component=$1
  local version=$2

  # If we have a global strategy, use it
  if [[ "$OVERWRITE_STRATEGY" == "all" ]]; then
    return 0
  fi
  if [[ "$OVERWRITE_STRATEGY" == "none" ]]; then
    print_success "$component already installed ($version) - skipped"
    return 1
  fi

  print_success "$component already installed ($version)"
  echo ""
  echo "  ? Reinstall/update $component?"
  echo "    1) Skip (keep current)"
  echo "    2) Reinstall"
  echo "    3) Reinstall all remaining"
  echo "    4) Skip all remaining"
  echo ""
  read -p "  Choice [1]: " choice
  choice=${choice:-1}

  case $choice in
    1) return 1 ;;
    2) return 0 ;;
    3) OVERWRITE_STRATEGY="all"; return 0 ;;
    4) OVERWRITE_STRATEGY="none"; return 1 ;;
    *) return 1 ;;
  esac
}

# Returns 0 if yes, 1 if no
confirm() {
  local prompt=$1
  local default=${2:-Y}

  if [[ "$default" == "Y" ]]; then
    read -p "  ? $prompt (Y/n) " response
    response=${response:-Y}
  else
    read -p "  ? $prompt (y/N) " response
    response=${response:-N}
  fi

  [[ "$response" =~ ^[Yy] ]]
}

# ============================================================================
# OS Detection
# ============================================================================
detect_os() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
    if [[ $(uname -m) == "arm64" ]]; then
      ARCH="arm64"
      BREW_PREFIX="/opt/homebrew"
    else
      ARCH="x86_64"
      BREW_PREFIX="/usr/local"
    fi
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if grep -qi microsoft /proc/version 2>/dev/null; then
      OS="wsl"
    else
      OS="linux"
    fi
    ARCH=$(uname -m)
    BREW_PREFIX="/home/linuxbrew/.linuxbrew"
  else
    print_error "Unsupported OS: $OSTYPE"
    exit 1
  fi

  echo -e "Detected: ${BOLD}$OS${NC} ($ARCH)"
}

# ============================================================================
# Component installers
# ============================================================================

install_homebrew() {
  print_step 1 14 "Checking Homebrew..."

  if command -v brew &> /dev/null; then
    local version=$(brew --version | head -n1 | awk '{print $2}')
    if ! prompt_existing "Homebrew" "$version"; then
      return 0
    fi
  else
    print_warning "Homebrew not found"
  fi

  if ! confirm "Install Homebrew?"; then
    return 0
  fi

  print_info "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Add to PATH for current session
  if [[ "$OS" == "linux" || "$OS" == "wsl" ]]; then
    eval "$($BREW_PREFIX/bin/brew shellenv)"
  fi

  print_success "Homebrew installed"
}

install_zsh() {
  print_step 2 14 "Checking Zsh..."

  if command -v zsh &> /dev/null; then
    local version=$(zsh --version | awk '{print $2}')
    if ! prompt_existing "Zsh" "$version"; then
      # Still check if it's the default shell
      if [[ "$SHELL" != *"zsh"* ]]; then
        print_warning "Current shell: $SHELL"
        if confirm "Switch to Zsh as default shell?"; then
          chsh -s $(which zsh)
          print_success "Default shell changed to Zsh"
        fi
      fi
      return 0
    fi
  else
    print_warning "Zsh not found"
  fi

  if ! confirm "Install Zsh?"; then
    return 0
  fi

  print_info "Installing Zsh..."
  brew install zsh

  # Set as default shell
  if confirm "Set Zsh as default shell?"; then
    chsh -s $(which zsh)
    print_success "Default shell changed to Zsh"
  fi

  print_success "Zsh installed"
}

install_ohmyzsh() {
  print_step 3 14 "Checking Oh-My-Zsh..."

  if [[ -d "$HOME/.oh-my-zsh" ]]; then
    if ! prompt_existing "Oh-My-Zsh" "installed"; then
      return 0
    fi
    # Remove for reinstall
    rm -rf "$HOME/.oh-my-zsh"
  fi

  if ! confirm "Install Oh-My-Zsh?"; then
    return 0
  fi

  print_info "Installing Oh-My-Zsh..."
  sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

  print_success "Oh-My-Zsh installed"
}

install_zsh_plugins() {
  print_step 4 14 "Installing Zsh plugins..."

  local custom_dir="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins"

  if [[ ! -d "$HOME/.oh-my-zsh" ]]; then
    print_warning "Oh-My-Zsh not found, skipping plugin installation"
    return 0
  fi

  if ! confirm "Install Zsh plugins (autosuggestions, syntax-highlighting)?"; then
    return 0
  fi

  local plugins=(
    "zsh-autosuggestions:https://github.com/zsh-users/zsh-autosuggestions"
    "zsh-syntax-highlighting:https://github.com/zsh-users/zsh-syntax-highlighting"
  )

  for entry in "${plugins[@]}"; do
    local name="${entry%%:*}"
    local url="${entry#*:}"
    local dest="$custom_dir/$name"

    if [[ -d "$dest" ]]; then
      print_success "$name (already installed)"
    else
      git clone --depth=1 "$url" "$dest" 2>/dev/null
      print_success "$name"
    fi
  done
}

install_p10k() {
  print_step 5 14 "Checking Powerlevel10k..."

  local p10k_dir="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k"

  if [[ -d "$p10k_dir" ]]; then
    if ! prompt_existing "Powerlevel10k" "installed"; then
      if confirm "Run p10k configure anyway?"; then
        print_info "Running p10k configure..."
        zsh -c "source $p10k_dir/powerlevel10k.zsh-theme && p10k configure"
      fi
      return 0
    fi
    rm -rf "$p10k_dir"
  fi

  if ! confirm "Install Powerlevel10k?"; then
    return 0
  fi

  print_info "Installing Powerlevel10k..."
  git clone --depth=1 https://github.com/romkatv/powerlevel10k.git "$p10k_dir"

  # Update .zshrc to use p10k
  if [[ -f "$HOME/.zshrc" ]]; then
    sed -i.bak 's/ZSH_THEME=".*"/ZSH_THEME="powerlevel10k\/powerlevel10k"/' "$HOME/.zshrc"
  fi

  print_success "Powerlevel10k installed"
  print_info "Running p10k configure..."

  # Run p10k configure interactively
  zsh -i -c "p10k configure" || true
}

install_git() {
  print_step 6 14 "Checking Git..."

  if command -v git &> /dev/null; then
    local version=$(git --version | awk '{print $3}')
    if ! prompt_existing "Git" "$version"; then
      return 0
    fi
  fi

  if ! confirm "Install Git?"; then
    return 0
  fi

  print_info "Installing Git..."
  brew install git

  print_success "Git installed"
}

install_gh() {
  print_step 7 14 "Checking GitHub CLI..."

  if command -v gh &> /dev/null; then
    local version=$(gh --version | head -n1 | awk '{print $3}')
    if ! prompt_existing "GitHub CLI" "$version"; then
      # Still offer to authenticate
      if ! gh auth status &> /dev/null; then
        if confirm "Authenticate with GitHub?"; then
          print_info "Running gh auth login..."
          gh auth login
        fi
      fi
      return 0
    fi
  fi

  if ! confirm "Install GitHub CLI?"; then
    return 0
  fi

  print_info "Installing GitHub CLI..."
  brew install gh

  print_success "GitHub CLI installed"

  if confirm "Authenticate with GitHub?"; then
    print_info "Running gh auth login..."
    gh auth login
  fi
}

install_node() {
  print_step 8 14 "Checking Node.js..."

  if command -v node &> /dev/null; then
    local version=$(node --version)
    if ! prompt_existing "Node.js" "$version"; then
      return 0
    fi
  fi

  if ! confirm "Install Node.js?"; then
    return 0
  fi

  echo ""
  echo "  ? Install via:"
  echo "    1) nvm (recommended)"
  echo "    2) Homebrew"
  echo ""
  read -p "  Choice [1]: " choice
  choice=${choice:-1}

  if [[ "$choice" == "2" ]]; then
    print_info "Installing Node.js via Homebrew..."
    brew install node
  else
    print_info "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

    # Load nvm for current session
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    print_info "Installing Node.js LTS..."
    nvm install --lts
    nvm use --lts

    print_success "nvm installed"
  fi

  print_success "Node.js installed"
}

install_pnpm() {
  print_step 9 14 "Checking pnpm..."

  if command -v pnpm &> /dev/null; then
    local version=$(pnpm --version)
    if ! prompt_existing "pnpm" "$version"; then
      return 0
    fi
  fi

  if ! confirm "Install pnpm?"; then
    return 0
  fi

  print_info "Installing pnpm..."

  if command -v corepack &> /dev/null; then
    corepack enable pnpm
  else
    npm install -g pnpm
  fi

  print_success "pnpm installed"
}

install_python() {
  print_step 10 14 "Checking Python 3..."

  if command -v python3 &> /dev/null; then
    local version=$(python3 --version | awk '{print $2}')
    if ! prompt_existing "Python" "$version"; then
      return 0
    fi
  fi

  if ! confirm "Install Python 3?"; then
    return 0
  fi

  print_info "Installing Python 3..."
  brew install python3

  print_success "Python 3 installed"
}

install_docker() {
  print_step 11 14 "Checking Docker..."

  if command -v docker &> /dev/null; then
    local version=$(docker --version | awk '{print $3}' | tr -d ',')
    if ! prompt_existing "Docker" "$version"; then
      return 0
    fi
  fi

  if ! confirm "Install Docker?"; then
    return 0
  fi

  print_info "Installing Docker..."

  if [[ "$OS" == "macos" ]]; then
    brew install --cask docker
    print_warning "Docker Desktop installed. Please start it from Applications."
  else
    # Linux/WSL - install docker engine
    brew install docker docker-compose
    print_warning "Docker installed. You may need to configure WSL2 backend."
  fi

  print_success "Docker installed"
}

install_cli_tools() {
  print_step 12 14 "Installing CLI tools..."

  local tools=(
    "curl"
    "wget"
    "jq"
    "tree"
    "htop"
    "ripgrep"
    "fd"
    "bat"
    "eza"
    "carapace"
    "atuin"
  )

  if ! confirm "Install CLI tools (curl, wget, jq, tree, htop, ripgrep, fd, bat, eza, carapace, atuin)?"; then
    return 0
  fi

  print_info "Installing CLI tools..."

  for tool in "${tools[@]}"; do
    if ! command -v "$tool" &> /dev/null; then
      brew install "$tool" 2>/dev/null || true
      print_success "$tool"
    else
      print_success "$tool (already installed)"
    fi
  done
}

install_claude_code() {
  print_step 13 14 "Checking Claude Code..."

  if command -v claude &> /dev/null; then
    local version=$(claude --version 2>/dev/null | head -n1 || echo "installed")
    if ! prompt_existing "Claude Code" "$version"; then
      return 0
    fi
  fi

  if ! confirm "Install Claude Code?"; then
    return 0
  fi

  print_info "Installing Claude Code..."
  brew install claude-code

  print_success "Claude Code installed"
}

install_claude_config() {
  print_step 14 14 "Installing Claude config..."

  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local src_dir="$SCRIPT_DIR/claude"
  local dest_dir="$HOME/.claude"

  if [[ ! -d "$src_dir" ]]; then
    print_warning "claude/ directory not found in repo, skipping"
    return 0
  fi

  if ! confirm "Install Claude config (agents, skills, settings)?"; then
    return 0
  fi

  # Copy everything from claude/ to ~/.claude/
  mkdir -p "$dest_dir"
  cp -r "$src_dir"/* "$dest_dir"/

  # Copy mcp.json to its special location
  if [[ -f "$src_dir/mcp.json" ]]; then
    cp "$src_dir/mcp.json" "$HOME/.mcp.json"
  fi

  print_success "Claude config installed to $dest_dir"
}

# ============================================================================
# Main
# ============================================================================
main() {
  print_header
  detect_os

  # Ensure we have basic tools
  if ! command -v curl &> /dev/null; then
    print_error "curl is required but not installed"
    exit 1
  fi

  # Run all installers
  install_homebrew

  # Ensure brew is in PATH before continuing
  if [[ -f "$BREW_PREFIX/bin/brew" ]]; then
    eval "$($BREW_PREFIX/bin/brew shellenv)"
  fi

  install_zsh
  install_ohmyzsh
  install_zsh_plugins
  install_p10k
  install_git
  install_gh
  install_node
  install_pnpm
  install_python
  install_docker
  install_cli_tools
  install_claude_code
  install_claude_config

  # Final summary
  echo ""
  echo -e "${CYAN}═══════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}Bootstrap complete!${NC}"
  echo ""

  # Check if running standalone (not from setup.sh)
  if [[ -z "$RUNNING_FROM_SETUP" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [[ -f "$SCRIPT_DIR/install.js" ]] && command -v node &> /dev/null; then
      echo ""
      if confirm "Run devkit installer now?"; then
        print_info "Launching devkit installer..."
        cd "$SCRIPT_DIR"
        npm install --silent 2>/dev/null
        node install.js
      fi
    fi
  fi

  echo ""
  echo "You may need to restart your terminal for all changes to take effect."
  echo ""
}

main "$@"
