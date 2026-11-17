#!/usr/bin/env bash
set -e

echo "=== Installing Root Modules ==="
npm install --ignore-scripts

echo "=== Installing Landing Modules ==="
(cd apps/landing && npm install)

echo "=== Installing Web Modules ==="
(cd apps/web && npm install)

echo "=== All Modules Installed Successfully ==="

