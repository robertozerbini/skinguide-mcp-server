FROM node:20-alpine AS release

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

ENTRYPOINT ["node", "stdio.js"]
