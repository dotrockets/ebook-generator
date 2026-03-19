#!/bin/bash
# Hostinger VPS — Initial Setup
# Run once on a fresh VPS: curl -fsSL <url> | bash
set -e

echo "=== Ebook Generator — VPS Setup ==="

# 1. System updates
echo ">> Updating system..."
apt-get update && apt-get upgrade -y

# 2. Install Docker
echo ">> Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# 3. Install Docker Compose plugin
echo ">> Installing Docker Compose..."
apt-get install -y docker-compose-plugin

# 4. Install Nginx
echo ">> Installing Nginx..."
apt-get install -y nginx

# 5. Install Certbot for SSL
echo ">> Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# 6. Create app directory
echo ">> Creating app directory..."
mkdir -p /opt/ebook-generator
chown $USER:$USER /opt/ebook-generator

# 7. Firewall
echo ">> Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Point ebookgenerator.puls.io DNS to this server's IP"
echo "  2. Clone repo:  cd /opt/ebook-generator && git clone <repo-url> ."
echo "  3. Copy nginx:  cp deploy/nginx.conf /etc/nginx/sites-available/ebook"
echo "  4.              ln -s /etc/nginx/sites-available/ebook /etc/nginx/sites-enabled/"
echo "  5. Get SSL:     certbot --nginx -d ebookgenerator.puls.io"
echo "  6. Deploy:      bash deploy/deploy.sh"
