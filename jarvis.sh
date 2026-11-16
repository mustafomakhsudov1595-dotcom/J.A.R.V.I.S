#!/usr/bin/env bash
# J.A.R.V.I.S. — macOS / Linux uchun bir buyruqda ishga tushirish:  ./jarvis.sh
# Birinchi safar kerakli narsalarni o'zi o'rnatadi.
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js topilmadi. https://nodejs.org dan o'rnating va qaytadan ishga tushiring."
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code o'rnatilmoqda..."
  npm install -g @anthropic-ai/claude-code
  echo "Endi Claude hisobingizga kiring: login qiling, so'ng /exit deb yozib chiqing."
  claude || true
fi

if [ ! -d node_modules ]; then
  echo "Birinchi ishga tushirish: kutubxonalar o'rnatilmoqda (bir necha daqiqa)..."
  npm install
fi

echo
echo "  [1] Faqat shu noutbukda"
echo "  [2] Noutbuk + telefon (bitta Wi-Fi, QR kod)"
echo "  [3] Noutbuk + telefon (internet orqali, istalgan tarmoqda)"
echo
read -r -p "  Tanlang (1, 2 yoki 3): " mode
case "$mode" in
  2) exec npm run phone ;;
  3)
    if ! command -v cloudflared >/dev/null 2>&1; then
      echo "cloudflared kerak. macOS: brew install cloudflared"
      echo "Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
      exit 1
    fi
    exec npm run public ;;
  *) exec npm start ;;
esac
