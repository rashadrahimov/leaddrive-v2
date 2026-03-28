#!/bin/bash
# ═══════════════════════════════════════════════════
# LeadDrive CRM v2 — Deploy to Hetzner VDS
# Run from Mac: bash scripts/deploy.sh
# ═══════════════════════════════════════════════════

SERVER="${DEPLOY_SERVER:?Set DEPLOY_SERVER env var}"
SSH_USER="${DEPLOY_SSH_USER:-root}"
APP_DIR="/opt/leaddrive-v2"
REPO="${DEPLOY_REPO:?Set DEPLOY_REPO env var}"
DOMAIN="${DEPLOY_DOMAIN:-leaddrivecrm.org}"
DB_USER="${DB_USER:-postgres}"
DB_PASS="${DB_PASS:?Set DB_PASS env var}"
DB_NAME="${DB_NAME:-leaddrive_v2}"

echo "🚀 LeadDrive CRM v2 — Deploying to $SERVER"
echo ""

# ─── Step 1: Setup server environment ───
echo "1️⃣  Setting up server..."
ssh -o StrictHostKeyChecking=no "$SSH_USER@$SERVER" bash -s << 'REMOTE'
set -e

# Install Node.js 20 if not present
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 20 ]]; then
  echo "   Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &>/dev/null; then
  echo "   Installing PM2..."
  npm install -g pm2
fi

echo "   Node: $(node -v), npm: $(npm -v), PM2: $(pm2 -v)"

# Create app directory
mkdir -p /opt/leaddrive-v2
REMOTE

echo "   ✅ Server ready"

# ─── Step 2: Clone/update repo ───
echo "2️⃣  Deploying code..."
ssh "$SSH_USER@$SERVER" bash -s << REMOTE
set -e
cd /opt

if [ -d "leaddrive-v2/.git" ]; then
  echo "   Updating existing repo..."
  cd leaddrive-v2
  git fetch origin
  git reset --hard origin/main
else
  echo "   Cloning repo..."
  rm -rf leaddrive-v2
  git clone $REPO leaddrive-v2
  cd leaddrive-v2
fi

echo "   ✅ Code deployed"
REMOTE

# ─── Step 3: Create .env ───
echo "3️⃣  Configuring environment..."
ssh "$SSH_USER@$SERVER" bash -s << 'REMOTE'
set -e
cd /opt/leaddrive-v2

# Create .env if not exists
if [ ! -f .env ]; then
  cat > .env << 'EOF'
# LeadDrive CRM v2 — Production
DATABASE_URL="${DATABASE_URL:?Set DATABASE_URL}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:?Set NEXTAUTH_SECRET}"
NEXTAUTH_URL="${NEXTAUTH_URL:-http://leaddrivecrm.org}"
NODE_ENV="production"
EOF
  echo "   Created .env"
else
  echo "   .env already exists"
fi
REMOTE

echo "   ✅ Environment configured"

# ─── Step 4: Create v2 database ───
echo "4️⃣  Setting up database..."
ssh "$SSH_USER@$SERVER" bash -s << 'REMOTE'
set -e

# Create v2 database if not exists (keeps v1 database intact)
PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME"

echo "   ✅ Database leaddrive_v2 ready"
REMOTE

# ─── Step 5: Install deps & build ───
echo "5️⃣  Installing dependencies & building..."
ssh "$SSH_USER@$SERVER" bash -s << 'REMOTE'
set -e
cd /opt/leaddrive-v2

echo "   Installing dependencies..."
npm ci --production=false 2>&1 | tail -3

echo "   Generating Prisma client..."
npx prisma generate

echo "   Running migrations..."
npx prisma migrate deploy

echo "   Building Next.js..."
npm run build 2>&1 | tail -5

echo "   ✅ Build complete"
REMOTE

# ─── Step 6: Import v1 data into v2 database ───
echo "6️⃣  Importing v1 data..."
ssh "$SSH_USER@$SERVER" bash -s << 'REMOTE'
set -e
cd /opt/leaddrive-v2

# Check if data already imported
COUNT=$(PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -t -A -c \
  "SELECT count(*) FROM companies" 2>/dev/null || echo "0")

if [ "$COUNT" -gt "0" ]; then
  echo "   Data already imported ($COUNT companies)"
else
  echo "   Running import..."
  npx tsx scripts/import-v1.ts 2>&1 | tail -20
fi

# Create admin user
npx tsx scripts/create-admin.ts 2>&1 | tail -3

echo "   ✅ Data ready"
REMOTE

# ─── Step 7: Start with PM2 ───
echo "7️⃣  Starting application..."
ssh "$SSH_USER@$SERVER" bash -s << 'REMOTE'
set -e
cd /opt/leaddrive-v2

# Stop existing if running
pm2 delete leaddrive-v2 2>/dev/null || true

# Start on port 3001 (v1 uses 8000, nginx will proxy)
PORT=3001 pm2 start npm --name "leaddrive-v2" -- start

# Save PM2 config
pm2 save

# Setup PM2 startup on reboot
pm2 startup 2>/dev/null || true

echo ""
echo "   ✅ App running on port 3001"
pm2 status
REMOTE

# ─── Step 8: Configure Nginx ───
echo "8️⃣  Configuring Nginx..."
ssh "$SSH_USER@$SERVER" bash -s << 'REMOTE'
set -e

# Install nginx if not present
if ! command -v nginx &>/dev/null; then
  apt-get install -y nginx
fi

# Create v2 nginx config
cat > /etc/nginx/sites-available/leaddrive-v2 << 'NGINX'
server {
    listen 80;
    server_name v2.leaddrivecrm.org;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/leaddrive-v2 /etc/nginx/sites-enabled/

# Test and reload nginx
nginx -t && systemctl reload nginx

echo "   ✅ Nginx configured"
REMOTE

echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Deployment complete!"
echo ""
echo "   🌐 v2: http://v2.leaddrivecrm.org"
echo "   🌐 Direct: http://$SERVER:3001"
echo "   🔑 Login: see .env for credentials"
echo ""
echo "   v1 (unchanged): http://leaddrivecrm.org"
echo ""
echo "   Next steps:"
echo "   1. Add DNS A record: v2.leaddrivecrm.org → $SERVER"
echo "   2. Enable SSL: certbot --nginx -d v2.leaddrivecrm.org"
echo "═══════════════════════════════════════════════════"
