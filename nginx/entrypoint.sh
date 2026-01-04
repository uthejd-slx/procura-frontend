#!/bin/sh
set -eu

CONFIG_FILE="/usr/share/nginx/html/assets/runtime-config.js"

if [ -n "${API_BASE_URL:-}" ] && [ -f "$CONFIG_FILE" ]; then
  sed -i "s|__API_BASE_URL__|${API_BASE_URL}|g" "$CONFIG_FILE"
fi

exec nginx -g 'daemon off;'
