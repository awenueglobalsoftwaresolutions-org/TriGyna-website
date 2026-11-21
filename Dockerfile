# ==============================================================================
# TriGyna Healthcare Management Platform — Production Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Production Dependencies
FROM node:20-alpine AS dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY apps/api/package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Stage 2: Hardened Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Run container as non-root user for healthcare security compliance (HIPAA / OWASP)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 trigyna -G nodejs

# Copy runtime dependencies and application source
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json
COPY apps/api/src ./src

# Set ownership to unprivileged user
RUN chown -R trigyna:nodejs /app

USER trigyna

EXPOSE 5000

# Native Docker Healthcheck targeting Railway dynamic port
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-5000}/health || exit 1

# Launch production server with proper signal handling
CMD ["node", "src/server.js"]
