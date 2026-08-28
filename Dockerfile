# syntax=docker/dockerfile:1

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ARG SITE_URL
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN DIRECT_URL="postgresql://prisma:prisma@127.0.0.1:5432/postgres" npm run db:generate \
  && test -n "$SITE_URL" \
  && SITE_URL="$SITE_URL" npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ARG APP_VERSION=local
ENV NODE_ENV=production
ENV APP_VERSION=$APP_VERSION

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const port = process.env.PORT; if (!port) process.exit(1); fetch('http://127.0.0.1:' + port + '/api/health/live').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "server.js"]
