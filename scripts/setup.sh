#!/usr/bin/env bash
# One-shot local setup (macOS / Linux / Git Bash)
set -euo pipefail
cd "$(dirname "$0")/.."

for app in web landing; do
  if [ ! -f "apps/$app/.env.local" ]; then
    cp "apps/$app/.env.example" "apps/$app/.env.local"
    echo "Created apps/$app/.env.local from .env.example"
  fi
done

npm install --no-audit --no-fund
npm run install:all

echo
echo "Done. Start both apps with:  npm run dev"
