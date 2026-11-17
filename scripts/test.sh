#!/usr/bin/env bash
set -e

echo "=== Running Tests in Apps/Web ==="
(cd apps/web && npm run test)

