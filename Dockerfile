FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
ENV NODE_ENV=development
RUN npm install

COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
RUN npm run build && echo "=== Build successful ===" && ls -la dist/ && ls -la node_modules/sql.js/dist/sql-wasm.wasm

COPY public ./public
RUN mkdir -p /app/data

# Verify wasm file exists
RUN ls -la node_modules/sql.js/dist/sql-wasm.wasm

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/app/data

EXPOSE 3000

CMD ["node", "--trace-warnings", "--experimental-vm-modules", "dist/server.js"]