#!/bin/bash
# Install the daily auto-book cron job on the VPS
# Run once: bash deploy/setup-cron.sh
set -e

# Read secret from .env on VPS
SECRET=$(grep AUTO_BOOK_SECRET /opt/ebook-generator/.env 2>/dev/null | cut -d= -f2 || echo "")
DOMAIN=$(grep DOMAIN /opt/ebook-generator/.env 2>/dev/null | cut -d= -f2 || echo "ebookgenerator.puls.io")

# Create the cron log file
touch /var/log/auto-book.log

# Install crontab entry (daily at 8:00 AM Berlin time)
CRON_LINE="0 8 * * * AUTO_BOOK_SECRET=${SECRET} DOMAIN=${DOMAIN} /opt/ebook-generator/deploy/auto-book-cron.sh >> /var/log/auto-book.log 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "auto-book-cron"; then
  echo "Cron already installed, updating..."
  crontab -l | grep -v "auto-book-cron" | { cat; echo "$CRON_LINE"; } | crontab -
else
  echo "Installing cron..."
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
fi

echo "Cron installed:"
crontab -l | grep auto-book
echo ""
echo "Log: tail -f /var/log/auto-book.log"
