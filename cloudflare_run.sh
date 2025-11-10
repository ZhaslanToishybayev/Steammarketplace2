#!/bin/bash
CLOUDFLARED=$(which cloudflared 2>/dev/null || echo "./cloudflared")
$CLOUDFLARED tunnel --config ~/.cloudflared/config.yml run sgomarket-tunnel &
echo "Туннель запущен в фоне (PID: $!)"
sleep 2
echo ""
echo "Проверяем..."
curl -I http://sgomarket.com/api/health 2>/dev/null | head -3
