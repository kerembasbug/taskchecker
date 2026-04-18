#!/bin/sh
echo "=== TaskChecker Startup ==="
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_PATH: $DATABASE_PATH"
echo "Working directory: $(pwd)"
echo "Files in /app:"
ls -la /app/
echo "Files in /app/dist:"
ls -la /app/dist/ 2>/dev/null || echo "No dist directory!"
echo "Files in /app/node_modules/sql.js/dist:"
ls -la /app/node_modules/sql.js/dist/ 2>/dev/null || echo "No sql.js dist directory!"
echo "WASM file check:"
ls -la /app/sql-wasm.wasm 2>/dev/null || echo "No sql-wasm.wasm at /app/"
echo "=== Starting node ==="
node dist/server.js 2>&1
echo "=== Node exited with code $? ==="