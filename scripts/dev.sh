#!/usr/bin/env bash
set -e

echo "Starting ApexBuild development environments..."
echo "Landing app on: http://localhost:3000"
echo "Web app on:     http://localhost:5173"

(cd apps/landing && npm run dev) &
PID_LANDING=$!

(cd apps/web && npm run dev) &
PID_WEB=$!

trap "kill $PID_LANDING $PID_WEB" EXIT
wait

