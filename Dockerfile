FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
RUN npm run build

COPY public ./public
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/taskchecker.db

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/login || exit 1

CMD ["node", "dist/server.js"]