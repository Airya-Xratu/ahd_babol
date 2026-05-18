# ─── BullMQ Worker Dockerfile for Liara ───
# This Dockerfile creates a standalone image for the worker process
# that consumes jobs from the BullMQ queue and writes to PostgreSQL.

FROM node:22-alpine AS base

# Install openssl (needed by Prisma)
RUN apk add --no-cache openssl

# ─── Dependencies ───
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ─── Builder ───
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

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

# Install tsx for running TypeScript
RUN npm install -g tsx

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD pgrep -f "worker.ts" || exit 1

# Run the worker
CMD ["npx", "tsx", "worker.ts"]
