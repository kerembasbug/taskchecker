FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm install --include=dev

COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
RUN npm run build

COPY public ./public
RUN mkdir -p /app/data
RUN cp node_modules/sql.js/dist/sql-wasm.wasm /app/sql-wasm.wasm
RUN chmod +x /app/dist/server.js || true

# Copy static files that need to be served  
RUN ls -la /app/dist/ && ls -la /app/public/ && ls -la /app/node_modules/sql.js/dist/sql-wasm.wasm

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/app/data

EXPOSE 3000

COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/bin/sh", "/app/start.sh"]