# ==================================
# Stage 1: Dependencies
# ==================================
FROM node:20-alpine AS deps

# Install pnpm with specific version (9.x supports lockfile v6)
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

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

# Build application
RUN pnpm build

# ==================================
# Stage 3: Runner
# ==================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install Chromium for Puppeteer (PDF generation)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Install pnpm for running database migrations
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

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
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

# Copy drizzle-kit and dependencies from builder (for migrations)
COPY --from=builder /app/node_modules/drizzle-kit ./node_modules/drizzle-kit
COPY --from=builder /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder /app/node_modules/postgres ./node_modules/postgres
COPY --from=builder /app/node_modules/dotenv ./node_modules/dotenv

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
