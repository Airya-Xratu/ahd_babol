# 🚀 Getting Started

## Prerequisites

- **Node.js** 18+
- **Docker** & Docker Compose (for PostgreSQL and Redis)
- **Git**

## Quick Start

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

```bash
npm run dev
```

Runs on http://localhost:3000

The BullMQ worker starts **automatically** inside the Next.js server via `instrumentation.ts`. You'll see in the console:

```
[Worker] 🚀 Worker ready — listening to queue "signatures" (concurrency: 50)
```

> 💡 **No separate worker process needed!** The worker runs inside Next.js using the instrumentation hook. If you still want to run the standalone worker (for development), use `npm run worker`.

### 7. Verify Everything Works

1. Open http://localhost:3000 in your browser
2. Click "ورود و بیعت" to enter the content page
3. Fill the form and submit
4. API returns `202` — job is queued
5. Check the console — you should see: `[Worker] ✓ Job xxx — FirstName LastName (nationalCode)`
6. Refresh the page — count should update

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (port 3000, webpack) — worker starts automatically |
| `npm run worker` | Start BullMQ worker as standalone process (optional) |
| `npm run lint` | Run ESLint checks |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Create & apply migration |
| `npm run db:reset` | Reset database (destroys data!) |
| `npm run docker:up` | Start PostgreSQL + Redis containers |
| `npm run docker:down` | Stop containers |

## Docker Reference

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
