# ⚙️ Configuration

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://covenant_user:covenant_pass@localhost:5432/covenant_db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | Next.js server port | `3000` |

## Worker Configuration

Edit `src/instrumentation.ts` to adjust:

| Setting | Default | Description |
|---------|---------|-------------|
| `CONCURRENCY` | 50 | Max concurrent jobs processed |
| `attempts` | 3 | Max retry attempts per job |
| `backoff` | exponential 1s | 1s → 2s → 4s retry delay |

> 💡 The `attempts` and `backoff` settings are configured in `src/lib/queue.ts` (the queue definition), while `CONCURRENCY` is in `src/instrumentation.ts` (the worker).

## Docker Services

Edit `docker-compose.yml` to adjust PostgreSQL/Redis settings:

- **PostgreSQL**: User `covenant_user`, Password `covenant_pass`, DB `covenant_db`, Port `5432`
- **Redis**: Port `6379`, max memory `256mb` with LRU eviction

## Next.js Configuration

The `next.config.ts` file includes:

```typescript
{
  output: "standalone",           // Required for Liara deployment
  typescript: {
    ignoreBuildErrors: true,      // Skip type checking during build
  },
  reactStrictMode: false,
  experimental: {
    instrumentationHook: true,    // Enables instrumentation.ts (BullMQ worker)
  },
}
```
