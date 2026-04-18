FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
RUN npm run build && ls -la dist/

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY public ./public
RUN mkdir -p /app/data && ls -la public/ && ls -la dist/

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/taskchecker.db

EXPOSE 3000

CMD ["sh", "-c", "ls -la dist/ && ls -la public/ && node dist/server.js"]