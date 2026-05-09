# ── Build React app ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── Production image — Express serves API + built React ───────────────────────
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production --legacy-peer-deps

COPY server/ ./server/
COPY --from=builder /app/build ./build/

RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

EXPOSE 3001

CMD ["node", "server/index.js"]
