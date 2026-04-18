FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --include=dev

COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
RUN npm run build && echo "=== Build OK ==="

COPY public ./public
RUN mkdir -p /app/data

# Keep sql.js wasm file accessible
RUN ls -la node_modules/sql.js/dist/sql-wasm.wasm

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/app/data

EXPOSE 3000

CMD ["node", "dist/server.js"]