# ==============================================================================
# TriGyna Healthcare Management Platform — API Subdirectory Dockerfile
# ==============================================================================

# Stage 1: Production Dependencies
FROM node:20-alpine AS dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Stage 2: Hardened Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Run container as non-root user for healthcare security compliance
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 trigyna -G nodejs

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json
COPY src ./src

RUN chown -R trigyna:nodejs /app

USER trigyna

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-5000}/health || exit 1

CMD ["node", "src/server.js"]
