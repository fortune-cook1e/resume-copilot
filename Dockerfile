# Transitional image for the preserved web application only.
# The new NestJS application's production deployment is not part of this scaffold.
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
RUN pnpm --filter @resume-copilot/web build

FROM node:22-alpine AS runner
WORKDIR /app/apps/web
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto-cjk
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# Preserve the legacy deployment's Drizzle migration command and inherited root config.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json /app/tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json /app/apps/web/tsconfig.json /app/apps/web/drizzle.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/db ./db
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/types ./types

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
