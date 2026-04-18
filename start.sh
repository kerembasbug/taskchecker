#!/bin/sh
echo "=== TaskChecker Startup ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_PATH: $DATABASE_PATH"
echo "HOSTNAME: $HOSTNAME"
echo "pwd: $(pwd)"
echo "node version: $(node --version)"
echo "Files in /app:"
ls -la /app/ 2>&1
echo "Files in /app/dist:"
ls -la /app/dist/ 2>&1
echo "Files in /app/node_modules/better-sqlite3:"
ls /app/node_modules/better-sqlite3/build/ 2>&1 || echo "No build dir"
echo "=== Starting node dist/server.js ==="
node --trace-warnings dist/server.js 2>&1