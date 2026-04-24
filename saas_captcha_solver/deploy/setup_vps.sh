#!/bin/bash
# ============================================
# Recap1s Turnstile Solver - VPS Setup Script
# Tested on Ubuntu 22.04 / 24.04
# ============================================

set -e

echo "🚀 Recap1s VPS Setup Starting..."

# ============================================
# 1. System dependencies
# ============================================
echo "📦 Installing system dependencies..."
sudo apt update
sudo apt install -y \
    xvfb \
    chromium-browser \
    python3 python3-pip python3-venv \
    curl wget unzip \
    fonts-liberation fonts-noto-cjk \
    libnss3 libatk-bridge2.0-0 libdrm2 \
    libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libasound2 libpangocairo-1.0-0 \
    libgtk-3-0

# ============================================
# 2. Node.js (v20 LTS)
# ============================================
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node.js: $(node -v)"

# ============================================
# 3. Python dependencies
# ============================================
echo "🐍 Installing Python dependencies..."
pip3 install DrissionPage --break-system-packages 2>/dev/null || pip3 install DrissionPage

# ============================================
# 4. App setup
# ============================================
APP_DIR="/opt/recap1s"
echo "📁 Setting up app in $APP_DIR..."

if [ ! -d "$APP_DIR" ]; then
    # Clone from git
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    git clone https://github.com/trieudz61/capcapcap.git $APP_DIR
fi

cd $APP_DIR/saas_captcha_solver
npm install

# ============================================
# 5. Environment file
# ============================================
if [ ! -f .env ]; then
    echo "⚠️  Please create .env file at $APP_DIR/saas_captcha_solver/.env"
    echo "Example:"
    echo "  JWT_SECRET=your_jwt_secret"
    echo "  TURSO_DATABASE_URL=libsql://..."
    echo "  TURSO_AUTH_TOKEN=..."
fi

# ============================================
# 6. Systemd service (Xvfb)
# ============================================
echo "🖥️  Setting up Xvfb virtual display service..."
sudo tee /etc/systemd/system/xvfb.service > /dev/null << 'EOF'
[Unit]
Description=X Virtual Frame Buffer
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/Xvfb :99 -screen 0 1280x720x24 -ac +extension GLX +render -noreset
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable xvfb
sudo systemctl start xvfb

# ============================================
# 7. Systemd service (Recap1s API)
# ============================================
echo "🚀 Setting up Recap1s API service..."
sudo tee /etc/systemd/system/recap1s.service > /dev/null << EOF
[Unit]
Description=Recap1s Captcha Solver API
After=network.target xvfb.service
Requires=xvfb.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/saas_captcha_solver/src
Environment=DISPLAY=:99
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable recap1s

# ============================================
# 8. Hosts file helper
# ============================================
echo "📝 Creating hosts management script..."
sudo tee /usr/local/bin/recap1s-add-domain > /dev/null << 'SCRIPT'
#!/bin/bash
# Usage: recap1s-add-domain <domain>
DOMAIN=$1
if [ -z "$DOMAIN" ]; then
    echo "Usage: recap1s-add-domain <domain>"
    exit 1
fi
if grep -q "$DOMAIN" /etc/hosts; then
    echo "Domain $DOMAIN already in /etc/hosts"
else
    echo "127.0.0.1       $DOMAIN" | sudo tee -a /etc/hosts
    echo "✅ Added $DOMAIN -> 127.0.0.1"
fi
SCRIPT
sudo chmod +x /usr/local/bin/recap1s-add-domain

# Add wechoice.vn by default
recap1s-add-domain wechoice.vn

# ============================================
# 9. Start everything
# ============================================
echo ""
echo "============================================"
echo "✅ Setup complete!"
echo "============================================"
echo ""
echo "Commands:"
echo "  sudo systemctl start recap1s     # Start API"
echo "  sudo systemctl stop recap1s      # Stop API"
echo "  sudo systemctl restart recap1s   # Restart API"
echo "  sudo journalctl -u recap1s -f    # View logs"
echo ""
echo "  recap1s-add-domain <domain>      # Add domain to hosts"
echo ""
echo "API will be available at: http://<VPS_IP>:5050"
echo ""
echo "⚠️  Don't forget to:"
echo "  1. Create .env file at $APP_DIR/saas_captcha_solver/.env"
echo "  2. Configure firewall: sudo ufw allow 5050"
echo "  3. Start: sudo systemctl start recap1s"
