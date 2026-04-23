# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development
# python3/make/g++ available for better-sqlite3 in case prebuild is unavailable.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json vite.config.ts postcss.config.js tailwind.config.ts index.html ./
COPY src ./src
COPY server ./server
RUN npm run build

FROM node:20-alpine AS deps
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DIR=/app/data \
    PORT=3000
RUN apk add --no-cache tini wget \
 && mkdir -p /app/data \
 && chown -R node:node /app
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/dist-server ./dist-server
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist-server/index.js"]
