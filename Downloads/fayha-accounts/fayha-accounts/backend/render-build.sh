#!/bin/bash
# ==========================================
# Render.com build script
# Switches Prisma from SQLite → PostgreSQL for production
# ==========================================

set -e

echo "=== Render Build: Switching to PostgreSQL ==="

# Replace sqlite with postgresql in schema
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

echo "  ✓ Prisma provider set to postgresql"

# Install dependencies
npm ci

# Generate Prisma client for PostgreSQL
npx prisma generate

# Build TypeScript
npm run build

echo "  ✓ Build complete"
