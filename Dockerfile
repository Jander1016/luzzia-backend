# Builder
FROM node:lts-alpine3.22 AS builder
WORKDIR /app

# install pnpm
RUN npm install -g pnpm@latest

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Clean install with frozen lockfile
RUN pnpm install --frozen-lockfile --no-optional

# Verify TypeScript version (should be 5.1.6)
RUN pnpm list typescript

# Copy source code
COPY . .

# Build the application
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