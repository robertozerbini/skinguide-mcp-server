# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --production

# Quiet NPM warnings
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Entry point
ENTRYPOINT ["node", "dist/index.js"]
