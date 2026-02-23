#!/bin/bash
# ==========================================
# FAYHA ACCOUNTS - Full Deploy
# Frontend → Cloudflare Pages
# Backend  → Render.com (auto via GitHub push)
# ==========================================
#
# PREREQUISITES:
#   1. npm install -g wrangler     (Cloudflare CLI)
#   2. wrangler login              (authenticate once)
#   3. Backend on Render.com connected to GitHub repo
#
# USAGE:
#   bash deploy.sh
#
# ==========================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# ==========================================
# CONFIG - Change these for your setup
# ==========================================
BACKEND_URL="https://fayha-backend.onrender.com"
CF_PROJECT="fayha-accounts"

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║   FAYHA ACCOUNTS - Production Deploy              ║"
echo "║   Frontend: Cloudflare Pages                      ║"
echo "║   Backend:  Render.com (via git push)             ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# ==========================================
# STEP 1: Push to GitHub (triggers Render backend deploy)
# ==========================================
echo "[1/4] Pushing to GitHub (triggers Render backend deploy)..."
cd "$ROOT_DIR"
git add -A
git commit -m "Deploy: $(date +%Y-%m-%d_%H:%M)" 2>/dev/null || echo "  No changes to commit"
git push origin main
echo "  ✓ Backend will auto-deploy on Render.com"
echo ""

# ==========================================
# STEP 2: Build frontend with production API URL
# ==========================================
echo "[2/4] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install
echo ""

echo "[3/4] Building frontend (API → $BACKEND_URL/api/v1)..."
VITE_API_URL="$BACKEND_URL/api/v1" npm run build
echo "  ✓ Frontend built to dist/"
echo ""

# ==========================================
# STEP 3: Deploy frontend to Cloudflare Pages
# ==========================================
echo "[4/4] Deploying frontend to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name="$CF_PROJECT"
echo ""

echo "╔════════════════════════════════════════════════════╗"
echo "║   ✓ DEPLOYMENT COMPLETE                           ║"
echo "╠════════════════════════════════════════════════════╣"
echo "║                                                    ║"
echo "║   Frontend: https://$CF_PROJECT.pages.dev          ║"
echo "║   Backend:  $BACKEND_URL                           ║"
echo "║   API:      $BACKEND_URL/api/v1                    ║"
echo "║   Health:   $BACKEND_URL/health                    ║"
echo "║                                                    ║"
echo "║   NOTE: Backend takes ~2 min to deploy on Render   ║"
echo "╚════════════════════════════════════════════════════╝"
