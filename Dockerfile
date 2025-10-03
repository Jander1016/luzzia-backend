# Builder
FROM node:lts-alpine3.22 AS builder
WORKDIR /app

# install pnpm
RUN npm install -g pnpm@latest

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Production image
FROM node:lts-alpine3.22 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@latest

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
# Copy config / env if needed (we expect to provide .env via docker run or compose)
EXPOSE 3001
CMD ["node", "dist/main.js"]