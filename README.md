# 🏛️ پلتفرم بیعت‌نامه — Covenant Signing Platform

A high-performance covenant signing platform built with **Next.js 16**, **PostgreSQL**, **Redis**, and **BullMQ**. Designed to handle up to **50,000 requests/minute** using a push-based queue architecture.

---

## 🏗️ Architecture

```
User → Next.js API (validate + queue) → Redis/BullMQ → Worker → PostgreSQL
                ↕                                    ↕
           202 Accepted                    Insert into Signature table
```

### How It Works

1. **API Layer** (`POST /api/sign`): Validates input with Zod, pushes job to BullMQ queue in Redis, returns `202 Accepted` immediately (~5ms).
2. **Queue** (BullMQ + Redis): Jobs wait in Redis for processing. BullMQ handles retries, backoff, and dead-letter automatically.
3. **Worker** (`worker.ts`): A standalone process that listens to the queue, processes each job by inserting into PostgreSQL. Handles duplicate `nationalCode` via `P2002` error.
4. **Count API** (`GET /api/count`): Returns confirmed signature count with 10-second Redis cache.

---

## 📋 Prerequisites

- **Node.js** 18+
- **Docker** & Docker Compose (for PostgreSQL and Redis)
- **Git**

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/Airya-Xratu/ahd_babol.git
cd ahd_babol
```

### 2. Install Dependencies

```bash
npm install
```

> ⚠️ **Important:** If you get errors about missing native modules (like `lightningcss.darwin-x64.node`), delete and reinstall:
> ```bash
> rm -rf node_modules package-lock.json
> npm install
> ```

### 3. Start PostgreSQL and Redis with Docker

```bash
# Start both services in the background
docker compose up -d

# Verify they're running
docker compose ps
```

You should see two healthy containers:
- `covenant_postgres` on port **5432**
- `covenant_redis` on port **6379**

> **First time?** Docker will pull the images (~100MB). Subsequent starts are instant.

### 4. Configure Environment

Copy the example env file:

```bash
cp .env.local.example .env.local
```

The default values work with the Docker containers:

```env
DATABASE_URL="postgresql://covenant_user:covenant_pass@localhost:5432/covenant_db"
REDIS_URL="redis://localhost:6379"
PORT=3000
```

### 5. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to PostgreSQL (creates tables)
npx prisma db push
```

### 6. Start the Application

You need **two terminal windows** (or tabs):

**Terminal 1 — Next.js Web App:**
```bash
npm run dev
```
→ Runs on http://localhost:3000

**Terminal 2 — BullMQ Worker:**
```bash
npm run worker
```
→ You should see: `🚀 Worker ready — listening to queue "signatures"`

### 7. Verify Everything Works

1. Open http://localhost:3000 in your browser
2. Click "ورود و بیعت" to enter the content page
3. Fill the form and submit
4. API returns `202` — job is queued
5. Check the worker terminal — you should see: `✓ Job xxx — FirstName LastName (nationalCode)`
6. Refresh the page — count should update

---

## 🛠️ Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (port 3000, webpack) |
| `npm run worker` | Start BullMQ worker process |
| `npm run lint` | Run ESLint checks |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Create & apply migration |
| `npm run db:reset` | Reset database (destroys data!) |
| `npm run docker:up` | Start PostgreSQL + Redis containers |
| `npm run docker:down` | Stop containers |

---

## 📁 Project Structure

```
ahd_babol/
├── prisma/
│   └── schema.prisma          # Database schema (PostgreSQL)
├── public/
│   ├── background.png         # Landing page background
│   ├── header.png             # Content page header banner
│   └── fonts/                 # IranYekanX FaNum fonts
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── sign/route.ts  # POST /api/sign — queue signature
│   │   │   └── count/route.ts # GET /api/count — get count (Redis cached)
│   │   ├── globals.css        # Global styles + Tailwind
│   │   ├── layout.tsx         # Root layout (RTL, custom fonts)
│   │   └── page.tsx           # Main page (landing + content + form)
│   └── lib/
│       ├── db.ts              # Prisma client singleton
│       ├── queue.ts           # BullMQ queue definition
│       ├── redis.ts           # Redis client singleton
│       └── validators.ts      # Zod validation schema (Persian errors)
├── worker.ts                  # BullMQ worker (standalone process)
├── docker-compose.yml         # PostgreSQL + Redis
├── .env.local.example         # Environment template
└── package.json
```

---

## 🔌 API Endpoints

### `POST /api/sign`

Submit a new signature (queues for processing).

**Request:**
```json
{
  "firstName": "علی",
  "lastName": "محمدی",
  "nationalCode": "1234567890",
  "mobile": "09123456789"
}
```

**Response (202):**
```json
{
  "message": "درخواست شما در صف پردازش قرار گرفت",
  "queued": true
}
```

**Response (400) — Validation Error:**
```json
{
  "message": "کد ملی: کد ملی باید دقیقاً ۱۰ رقم باشد"
}
```

### `GET /api/count`

Get the confirmed signature count (cached in Redis for 10 seconds).

**Response (200):**
```json
{
  "confirmed": 12345,
  "count": 12345
}
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://covenant_user:covenant_pass@localhost:5432/covenant_db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | Next.js server port | `3000` |

### Worker Configuration

Edit `worker.ts` to adjust:

| Setting | Default | Description |
|---------|---------|-------------|
| `CONCURRENCY` | 50 | Max concurrent jobs processed |
| `attempts` | 3 | Max retry attempts per job |
| `backoff` | exponential 1s | 1s → 2s → 4s retry delay |

### Docker Services

Edit `docker-compose.yml` to adjust PostgreSQL/Redis settings:

- **PostgreSQL**: User `covenant_user`, Password `covenant_pass`, DB `covenant_db`, Port `5432`
- **Redis**: Port `6379`, max memory `256mb` with LRU eviction

---

## 🐳 Docker Reference

### Start Services

```bash
docker compose up -d
```

### Stop Services

```bash
docker compose down
```

### Stop & Remove Data

```bash
docker compose down -v
```

### View Logs

```bash
docker compose logs -f postgres
docker compose logs -f redis
```

### Connect to PostgreSQL

```bash
docker exec -it covenant_postgres psql -U covenant_user -d covenant_db
```

### Connect to Redis

```bash
docker exec -it covenant_redis redis-cli
```

---

## 🚢 Production Deployment (Liara)

### Environment Variables on Liara

Set the following in your Liara dashboard:

- `DATABASE_URL` — Managed PostgreSQL connection string
- `REDIS_URL` — Managed Redis connection string

### Worker Service

Add a worker service to `liara.json`:

```json
{
  "services": [
    {
      "name": "web",
      "startCommand": "npm start"
    },
    {
      "name": "worker",
      "startCommand": "npx tsx worker.ts"
    }
  ]
}
```

### Scaling

Both web and worker services can scale horizontally. BullMQ handles distributed workers automatically — just run more worker instances.

---

## 🔧 Troubleshooting

### "Cannot find module lightningcss.darwin-x64.node"

This means `node_modules` has corrupted or missing macOS native binaries. Fix:

```bash
rm -rf node_modules package-lock.json
npm install
```

### "@next/swc-darwin-x64" error

Same issue — reinstall node_modules on your Mac (don't copy from Linux):

```bash
rm -rf node_modules package-lock.json
npm install
```

### "Cannot connect to Redis"

```bash
# Check if Redis container is running
docker compose ps

# Restart Redis
docker compose restart redis
```

### "Cannot connect to PostgreSQL"

```bash
# Check if PostgreSQL is ready
docker exec covenant_postgres pg_isready -U covenant_user

# Check logs
docker compose logs postgres
```

### "Worker not processing jobs"

1. Ensure worker is running: `npm run worker`
2. Check Redis connectivity: `docker exec -it covenant_redis redis-cli ping`
3. Check worker logs for errors

### "Port 3000 already in use"

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>
```

### Reset Database

```bash
npx prisma migrate reset
```

---

## 📊 Performance Characteristics

| Metric | Value |
|--------|-------|
| API response time (POST /api/sign) | ~5ms (Redis only) |
| API response time (GET /api/count) | ~2ms (Redis cached) / ~50ms (cache miss) |
| Worker throughput | ~1000 jobs/sec (concurrency=50) |
| Queue max throughput | Limited by Redis (~100K ops/sec) |
| Duplicate detection | PostgreSQL unique constraint (P2002) |

---

## 📝 License

Private — All rights reserved.
