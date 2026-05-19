# 🏗️ Architecture

A high-performance covenant signing platform built with **Next.js 16**, **PostgreSQL**, **Redis**, and **BullMQ**. Designed to handle up to **50,000 requests/minute** using a push-based queue architecture.

## Flow

```
User → Next.js API (validate + queue) → Redis/BullMQ → Worker → PostgreSQL
                ↕                                    ↕
           202 Accepted                    Insert into Signature table
```

## How It Works

1. **API Layer** (`POST /api/sign`): Validates input with Zod, pushes job to BullMQ queue in Redis, returns `202 Accepted` immediately (~5ms).
2. **Queue** (BullMQ + Redis): Jobs wait in Redis for processing. BullMQ handles retries, backoff, and dead-letter automatically.
3. **Worker** (`src/instrumentation.ts`): Runs inside the Next.js server process via Next.js instrumentation hook. Listens to the BullMQ queue and inserts signatures into PostgreSQL. Handles duplicate `nationalCode` via `P2002` error.
4. **Count API** (`GET /api/count`): Returns confirmed signature count with 10-second Redis cache.

## Why Is the Worker Embedded?

The BullMQ worker runs **inside Next.js** via `instrumentation.ts` instead of as a separate Docker process. This decision was made because:

- **Liara's build environment cannot access international URLs** (Docker Hub, Alpine repos, npm registry) — deploying a separate Docker app fails
- **Saves money** — no need for a separate Liara app (~۳۵۰,۰۰۰ تومان/month saved)
- **Simpler deployment** — one `liara deploy` command instead of two
- **No performance impact** at this scale — the worker adds ~30MB RAM and near-zero CPU when idle

> If you ever need to separate the worker for extreme scale (>10K req/min), the code in `instrumentation.ts` is identical to `worker.ts` and can be extracted in minutes.

## Production Architecture on Liara

```
Your Users
    ↓
┌──────────────────────────────────────────────────┐
│  Liara Cloud Platform                            │
│                                                  │
│  ┌──────────────────┐    ┌──────────────────┐   │
│  │  Next.js Web App │───▶│     Redis        │   │
│  │  (PaaS)          │    │  (DBaaS)         │   │
│  │  ┌────────────┐  │    │  - BullMQ Queue  │   │
│  │  │ API routes │  │    │  - Count cache   │   │
│  │  │ + Worker   │◀─┼────┘                  │   │
│  │  └────────────┘  │                         │   │
│  └────────┬─────────┘                         │   │
│           │                                    │   │
│           ▼                                    │   │
│  ┌──────────────────┐                         │   │
│  │   PostgreSQL     │                         │   │
│  │   (DBaaS)        │                         │   │
│  └──────────────────┘                         │   │
│                                                  │
│  All connected via Private Network (internal)    │
└──────────────────────────────────────────────────┘
```

**3 resources on Liara:**
1. **PostgreSQL database** — stores signatures
2. **Redis database** — powers the BullMQ job queue + caching
3. **Next.js web app** — serves the website + API routes + BullMQ worker

## Performance Characteristics

| Metric | Value |
|--------|-------|
| API response time (POST /api/sign) | ~5ms (Redis only) |
| API response time (GET /api/count) | ~2ms (Redis cached) / ~50ms (cache miss) |
| Worker throughput | ~1000 jobs/sec (concurrency=50) |
| Queue max throughput | Limited by Redis (~100K ops/sec) |
| Duplicate detection | PostgreSQL unique constraint (P2002) |
