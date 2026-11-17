#!/usr/bin/env bash
set -e

echo "=== 1/4 Typechecking Landing ==="
(cd apps/landing && npm run typecheck)

echo "=== 2/4 Typechecking Web ==="
(cd apps/web && npm run typecheck)

echo "=== 3/4 Running Tests in Web ==="
(cd apps/web && npm run test)

echo "=== 4/4 Building Both Applications ==="
(cd apps/landing && npm run build)
(cd apps/web && npm run build)

echo "=== ALL QUALITY GATES PASSED ==="

