FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
ENV NODE_ENV=development
RUN npm install

COPY tsconfig.json drizzle.config.ts ./
COPY src/ ./src/
RUN npm run build

COPY public ./public
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/app/data

EXPOSE 3000

CMD ["node", "dist/server.js"]