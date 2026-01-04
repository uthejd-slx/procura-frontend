#!/bin/sh
set -eu

CONFIG_FILE="/usr/share/nginx/html/assets/runtime-config.js"

if [ -f "$CONFIG_FILE" ]; then
  if [ -n "${API_BASE_URL:-}" ]; then
    sed -i "s|__API_BASE_URL__|${API_BASE_URL}|g" "$CONFIG_FILE"
  fi
  if [ -n "${APP_VERSION:-}" ]; then
    sed -i "s|__APP_VERSION__|${APP_VERSION}|g" "$CONFIG_FILE"
  else
    sed -i "s|__APP_VERSION__|dev|g" "$CONFIG_FILE"
  fi
fi

exec nginx -g 'daemon off;'
