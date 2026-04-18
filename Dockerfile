FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY public ./public
RUN mkdir -p /app/data && ls -la dist/ && ls -la public/

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/taskchecker.db

EXPOSE 3000

CMD ["sh", "-c", "echo 'Starting TaskChecker...' && node dist/server.js"]