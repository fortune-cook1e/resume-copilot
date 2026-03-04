# ==================================
# Stage 1: Dependencies
# ==================================
FROM node:20-alpine AS deps

# Install pnpm with specific version (9.x supports lockfile v6)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Skip puppeteer's bundled Chromium download — we use system chromium in runner
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install dependencies with retry and better error handling
RUN pnpm install --frozen-lockfile || \
    (echo "Frozen lockfile failed, trying without frozen..." && pnpm install)

# ==================================
# Stage 2: Builder
# ==================================
FROM node:20-alpine AS builder

# Install pnpm with specific version
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build arguments for client-side environment variables
ARG NEXT_PUBLIC_APP_URL

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Build application
RUN pnpm build

# ==================================
# Stage 3: Runner
# ==================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm for running database migrations
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Install system Chromium + fonts for PDF generation
# This is much lighter than running a separate Chrome Docker container (~100MB vs ~512MB)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

# Set Chromium path for puppeteer-core (auto-detected in route.ts)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy database schema and config for migrations
COPY --from=builder /app/db ./db
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

# Copy drizzle-kit and dependencies from builder (for migrations)
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

# Copy types directory (needed for schema imports)
COPY --from=builder /app/types ./types

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"


# next.js standalone mode expects the server to be started with "node server.js"
CMD ["node", "server.js"]
