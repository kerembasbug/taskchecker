#!/bin/sh
echo "=== TaskChecker Startup ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_PATH: $DATABASE_PATH"
echo "HOSTNAME: $HOSTNAME"
echo "pwd: $(pwd)"
echo "ls dist/:"
ls -la dist/ 2>&1
echo "ls node_modules/better-sqlite3/:"
ls -la node_modules/better-sqlite3/ 2>&1 | head -5
echo "Starting node..."
node dist/server.js > /app/data/startup.log 2>&1
EXIT_CODE=$?
echo "Node exited with code: $EXIT_CODE" >> /app/data/startup.log
echo "Node exited with code: $EXIT_CODE"