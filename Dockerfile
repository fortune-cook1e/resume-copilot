FROM node:24.21.0-alpine AS deps
WORKDIR /app
RUN npm install --global pnpm@12.15.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_APP_URL
ARG API_INTERNAL_URL=http://api:3001
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
RUN pnpm --filter @resume-copilot/web build

FROM deps AS api-builder
COPY . .
RUN pnpm --filter @resume-copilot/api build \
    && pnpm --filter @resume-copilot/api --prod deploy /opt/api

FROM node:24.21.0-alpine AS api-runner
WORKDIR /app
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont font-noto-cjk
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
COPY --from=api-builder --chown=node:node /opt/api ./
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]

FROM node:24.21.0-alpine AS runner
WORKDIR /app/apps/web
RUN npm install --global pnpm@12.15.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
