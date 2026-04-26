#!/bin/bash
# ============================================================
# Career AI — Production deploy avtomatlashtirish
#
# Birinchi marta: ssh + clone + .env.production yarat + ./deploy.sh
# Keyin: certbot bilan SSL qo'shing (pastdagi yo'riqnoma)
# Keyingi deploy'lar: ./deploy.sh
#
# Flaglar:
#   --skip-pull        git pull o'tkazib yuborish
#   --skip-frontend    frontend build o'tkazib yuborish
#   --skip-backend     backend build o'tkazib yuborish
#   --nginx-update     nginx config'ni qayta o'rnatish (diqqat: certbot SSL ni o'chiradi)
# ============================================================

set -e

# Ranglar
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
err() { echo -e "${RED}[x]${NC} $*" >&2; }
info() { echo -e "${BLUE}[i]${NC} $*"; }

# ------------------------------------------------------------
# Sozlamalar
# ------------------------------------------------------------
REPO_DIR="/opt/career-ai"
FRONTEND_DIR="$REPO_DIR/frontend"
FRONTEND_OUT="/var/www/career-ai.uz"
NGINX_SITE_NAME="career-ai.uz"
NGINX_SITE_SRC="$REPO_DIR/deploy/nginx/$NGINX_SITE_NAME.conf"
NGINX_SITE_DEST="/etc/nginx/sites-available/$NGINX_SITE_NAME"
ENV_FILE="$REPO_DIR/backend/.env.production"

SKIP_PULL=false
SKIP_FRONTEND=false
SKIP_BACKEND=false
NGINX_UPDATE=false

for arg in "$@"; do
    case $arg in
        --skip-pull) SKIP_PULL=true ;;
        --skip-frontend) SKIP_FRONTEND=true ;;
        --skip-backend) SKIP_BACKEND=true ;;
        --nginx-update) NGINX_UPDATE=true ;;
        *) warn "Noma'lum argument: $arg" ;;
    esac
done

# ------------------------------------------------------------
# Oldindan tekshirish
# ------------------------------------------------------------
log "Oldindan tekshirish"

if [ ! -d "$REPO_DIR/.git" ]; then
    err "Repo topilmadi: $REPO_DIR"
    err "Avval: git clone https://github.com/MunisaGH/antihack.git $REPO_DIR"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    err ".env.production topilmadi: $ENV_FILE"
    err "Namuna: cp $REPO_DIR/backend/.env.production.example $ENV_FILE"
    err "Keyin nano orqali tahrirlang va secretlarni to'ldiring."
    exit 1
fi

cd "$REPO_DIR"

# ------------------------------------------------------------
# 1. Git pull
# ------------------------------------------------------------
if [ "$SKIP_PULL" = false ]; then
    log "Git pull"
    git fetch --all
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    info "Joriy branch: $CURRENT_BRANCH"
    git reset --hard "origin/$CURRENT_BRANCH"
else
    info "Git pull o'tkazib yuborildi"
fi

# ------------------------------------------------------------
# 2. Backend: Docker build + restart
# ------------------------------------------------------------
if [ "$SKIP_BACKEND" = false ]; then
    log "Backend image qurish"
    docker compose build backend

    log "Backend ishga tushirish (entrypoint migrate + collectstatic ishlaydi)"
    docker compose up -d backend

    log "Backend sog'ligini kutish (10s)"
    sleep 10

    if docker compose ps backend | grep -qE "(Up|running)"; then
        info "Backend ishlamoqda ✓"
    else
        err "Backend ishga tushmadi. Loglar:"
        docker compose logs backend --tail 50
        exit 1
    fi
else
    info "Backend o'tkazib yuborildi"
fi

# ------------------------------------------------------------
# 3. Frontend: Docker orqali build
# ------------------------------------------------------------
if [ "$SKIP_FRONTEND" = false ]; then
    log "Frontend build (node:20-alpine container ichida)"

    mkdir -p "$FRONTEND_OUT"

    docker run --rm \
        -v "$FRONTEND_DIR":/app \
        -v "$FRONTEND_OUT":/output \
        -w /app \
        node:20-alpine \
        sh -c "npm install --no-audit --no-fund && npm run build && rm -rf /output/* && cp -r dist/. /output/ && chmod -R a+r /output"

    info "Frontend: $FRONTEND_OUT ga joylandi ✓"
else
    info "Frontend o'tkazib yuborildi"
fi

# ------------------------------------------------------------
# 4. Nginx config — faqat birinchi marta yoki --nginx-update flag bilan
# ------------------------------------------------------------
if [ ! -f "$NGINX_SITE_DEST" ] || [ "$NGINX_UPDATE" = true ]; then
    log "Nginx config o'rnatish"

    if [ "$NGINX_UPDATE" = true ] && [ -f "/etc/letsencrypt/live/$NGINX_SITE_NAME/fullchain.pem" ]; then
        warn "--nginx-update: mavjud SSL konfiguratsiyasini o'chiradi."
        warn "Davom etsa, certbot --nginx ni qayta ishga tushirishingiz kerak."
        read -p "Davom etamizmi? [y/N] " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Bekor qilindi"
            exit 0
        fi
    fi

    mkdir -p /var/www/certbot
    cp "$NGINX_SITE_SRC" "$NGINX_SITE_DEST"
    ln -sf "$NGINX_SITE_DEST" "/etc/nginx/sites-enabled/$NGINX_SITE_NAME"

    log "Nginx config test"
    if nginx -t; then
        log "Nginx reload"
        systemctl reload nginx
        info "Nginx yangilandi ✓"

        if [ ! -f "/etc/letsencrypt/live/$NGINX_SITE_NAME/fullchain.pem" ]; then
            echo ""
            warn "SSL hali yo'q. Hozir sayt faqat HTTP'da ishlayapti."
            warn "SSL yoqish uchun:"
            echo "    sudo certbot --nginx -d $NGINX_SITE_NAME --agree-tos -m admin@career-ai.uz --redirect"
        fi
    else
        err "Nginx config xatosi"
        exit 1
    fi
else
    info "Nginx config mavjud, tegmaymiz (force uchun --nginx-update)"
fi

# ------------------------------------------------------------
# 5. Yakuniy holat
# ------------------------------------------------------------
echo ""
log "Deploy yakunlandi ✓"
echo ""
info "Backend status:"
docker compose ps backend
echo ""
info "Oxirgi commit:"
git log -1 --oneline
echo ""

if [ -f "/etc/letsencrypt/live/$NGINX_SITE_NAME/fullchain.pem" ]; then
    info "Sayt: https://$NGINX_SITE_NAME"
else
    info "Sayt (HTTP): http://$NGINX_SITE_NAME"
fi
