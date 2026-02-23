#!/bin/bash
# ==========================================
# FAYHA ACCOUNTS - Frontend Only Deploy
# Deploys to Cloudflare Pages
# ==========================================
#
# USAGE: bash deploy-frontend.sh [BACKEND_URL]
#
# Examples:
#   bash deploy-frontend.sh
#   bash deploy-frontend.sh https://fayha-backend.onrender.com
# ==========================================

set -e

FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"
BACKEND_URL="${1:-https://fayha-backend.onrender.com}"
CF_PROJECT="fayha-accounts"

echo ""
echo "  Deploying Frontend → Cloudflare Pages"
echo "  API URL: $BACKEND_URL/api/v1"
echo ""

cd "$FRONTEND_DIR"

echo "[1/3] Installing dependencies..."
npm install

echo "[2/3] Building..."
VITE_API_URL="$BACKEND_URL/api/v1" npm run build

echo "[3/3] Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name="$CF_PROJECT"

echo ""
echo "  ✓ Frontend deployed: https://$CF_PROJECT.pages.dev"
echo ""
