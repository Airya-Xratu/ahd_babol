# ─── BullMQ Worker Dockerfile for Liara ───
# This Dockerfile creates a standalone image for the worker process
# that consumes jobs from the BullMQ queue and writes to PostgreSQL.
#
# IMPORTANT: Uses node:22-slim (Debian) instead of node:22-alpine
# because Liara's build environment has no international internet access.
# Debian slim already includes openssl (needed by Prisma) so we don't
# need to run apk add which would fail trying to reach alpinelinux.org.
# npm is configured to use Liara's Iranian mirror (npm.liara.ir).
#
# Deploy with: liara deploy --app=ahd-worker --platform=docker --dockerfile=worker.Dockerfile

FROM node:22-slim AS base

# Use Liara's npm mirror (Iran-based, no international internet needed)
RUN npm config set registry https://npm.liara.ir

# ─── Dependencies ───
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
# If package-lock.json exists, use npm ci (faster, deterministic).
# If not, fall back to npm install.
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# ─── Builder ───
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY prisma ./prisma/
RUN npx prisma generate

# ─── Runner ───
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy Prisma client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma schema (needed at runtime for Prisma Client)
COPY prisma ./prisma

# Copy worker source
COPY worker.ts ./worker.ts
COPY package.json ./package.json

# Install tsx for running TypeScript (uses Liara mirror from base)
RUN npm install -g tsx

# Health check — verify worker process is running
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD pgrep -f "worker.ts" || exit 1

# Run the worker
CMD ["npx", "tsx", "worker.ts"]
