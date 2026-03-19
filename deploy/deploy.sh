#!/bin/bash
# Deploy / Redeploy on Hostinger VPS
# Usage: bash deploy/deploy.sh
set -e

APP_DIR="/opt/ebook-generator"
cd "$APP_DIR"

echo "=== Deploying ebook-gen ==="

# 1. Pull latest code
echo ">> Pulling latest code..."
git pull origin main

# 2. Build & start with Docker Compose
echo ">> Building Docker image..."
docker compose build

echo ">> Starting container..."
docker compose up -d

# 3. Reload Nginx (just in case config changed)
echo ">> Reloading Nginx..."
nginx -t && systemctl reload nginx

echo ""
echo "=== Deployed! ==="
docker compose ps
echo ""
echo "Site: https://ebookgenerator.puls.io"
