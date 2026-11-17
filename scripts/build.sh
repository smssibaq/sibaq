#!/usr/bin/env bash
set -e

echo "=== Building Apps/Landing (Next.js) ==="
(cd apps/landing && npm run build)

echo "=== Building Apps/Web (React + Vite) ==="
(cd apps/web && npm run build)

echo "=== Build Completed Successfully ==="

