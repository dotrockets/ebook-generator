#!/bin/bash
# Daily auto-book trigger — called by systemd timer or crontab
# Generates a new ebook from Reddit ideas and sends email notification
#
# Setup on VPS:
#   1. Copy to /opt/ebook-generator/deploy/auto-book-cron.sh
#   2. chmod +x /opt/ebook-generator/deploy/auto-book-cron.sh
#   3. Add crontab entry (see below)
#
# Crontab (run at 8:00 AM daily):
#   0 8 * * * /opt/ebook-generator/deploy/auto-book-cron.sh >> /var/log/auto-book.log 2>&1
#
set -e

SECRET="${AUTO_BOOK_SECRET:-}"
DOMAIN="${DOMAIN:-ebookgenerator.puls.io}"

echo "=== Auto-Book $(date -Iseconds) ==="

# 1. Refresh Reddit ideas first
echo ">> Refreshing Reddit ideas..."
curl -sf "https://${DOMAIN}/api/reddit-scan?refresh=1" > /dev/null || echo "Reddit refresh failed (non-fatal)"

# 2. Wait a bit for ideas to be processed
sleep 10

# 3. Trigger auto-book generation (timeout 20min — generation takes 5-10min)
echo ">> Triggering auto-book..."
RESULT=$(curl -sf --max-time 1200 -X POST "https://${DOMAIN}/api/auto-book?secret=${SECRET}" 2>&1) || {
  echo "FAILED: $RESULT"
  exit 1
}

echo ">> Result: $RESULT"
echo "=== Done ==="
