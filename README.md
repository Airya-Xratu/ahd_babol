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
├── worker.Dockerfile          # Docker image for worker (Liara deployment)
├── worker.liara.json          # Liara config for worker app
├── liara.json                 # Liara config for Next.js web app
├── docker-compose.yml         # PostgreSQL + Redis (local development)
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

## 🚢 Production Deployment on Liara — Step-by-Step Guide

This section walks you through **everything** you need to do to deploy the Covenant Signing Platform to [Liara](https://liara.ir), from creating your account to having a live website with a custom domain and SSL.

### Architecture on Liara

```
Your Users
    ↓
┌─────────────────────────────────────────────────────┐
│  Liara Cloud Platform                               │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐  │
│  │ Next.js   │───▶│  Redis   │───▶│ Docker Worker│  │
│  │ Web App   │    │ (BullMQ) │    │ (worker.ts)  │  │
│  │ (PaaS)    │    │ (DBaaS)  │    │ (PaaS/Docker)│  │
│  └─────┬─────┘    └──────────┘    └──────┬───────┘  │
│        │                                  │         │
│        │         ┌──────────────┐         │         │
│        └────────▶│  PostgreSQL  │◀────────┘         │
│                  │  (DBaaS)     │                   │
│                  └──────────────┘                   │
│                                                     │
│  All connected via Private Network (internal)       │
└─────────────────────────────────────────────────────┘
```

You will create **4 resources** on Liara:
1. **PostgreSQL database** — stores signatures
2. **Redis database** — powers the BullMQ job queue + caching
3. **Next.js web app** — serves the website + API routes
4. **Docker worker app** — processes the BullMQ queue

---

### Liara Plan Reference (Resource Tiers)

Liara uses planet-named plans for both apps and databases. Here are all available tiers:

#### App (PaaS) Plans

| Plan | نام فارسی | RAM | CPU | Disk (SSD) | Monthly Price | Hourly Price |
|------|-----------|-----|-----|------------|---------------|--------------|
| Mercury | عطارد (رایگان) | 0.128 GB | 0.125 core | None | **Free** | Free |
| Earth | زمین (اقتصادی) | 0.5 GB | 0.5 core | 5 GB | ۳۵۰,۰۰۰ تومان | ۴۸۶ تومان |
| Mars | مریخ (اقتصادی پلاس) | 1 GB | 1 core | 10 GB | ۶۰۰,۰۰۰ تومان | ۸۳۳ تومان |
| Jupiter | مشتری (استاندارد) | 2 GB | 1 core | 20 GB | ۱,۰۵۰,۰۰۰ تومان | ۱,۴۵۸ تومان |
| Saturn | زحل (استاندارد پلاس) | 4 GB | 2 cores | 40 GB | ۱,۹۰۰,۰۰۰ تومان | ۲,۶۳۸ تومان |
| Uranus | اورانوس (حرفه‌ای) | 8 GB | 4 cores | 80 GB | ۳,۳۰۰,۰۰۰ تومان | ۴,۵۸۳ تومان |
| Neptune | نپتون (حرفه‌ای پلاس) | 16 GB | 8 cores | 160 GB | — | — |
| Pluto | پلوتون (اکستریم) | 32 GB | 16 cores | 320 GB | — | — |

#### Database (DBaaS) Plans

| Plan | نام فارسی | RAM | CPU | Disk (SSD) | Monthly Price | Hourly Price |
|------|-----------|-----|-----|------------|---------------|--------------|
| Mercury | عطارد (رایگان) | 0.128 GB | 0.125 core | 1.25 GB | **Free** | Free |
| Earth | زمین (اقتصادی) | 0.5 GB | 0.5 core | 5 GB | ۳۵۰,۰۰۰ تومان | ۴۸۶ تومان |
| Mars | مریخ (اقتصادی پلاس) | 1 GB | 1 core | 10 GB | ۶۰۰,۰۰۰ تومان | ۸۳۳ تومان |
| Jupiter | مشتری (استاندارد) | 2 GB | 1 core | 20 GB | ۱,۰۵۰,۰۰۰ تومان | ۱,۴۵۸ تومان |
| Saturn | زحل (استاندارد پلاس) | 4 GB | 2 cores | 40 GB | ۱,۹۰۰,۰۰۰ تومان | ۲,۶۳۸ تومان |
| Uranus | اورانوس (حرفه‌ای) | 8 GB | 4 cores | 80 GB | ۳,۳۰۰,۰۰۰ تومان | ۴,۵۸۳ تومان |
| Neptune | نپتون (حرفه‌ای پلاس) | 16 GB | 8 cores | 160 GB | — | — |
| Pluto | پلوتون (اکستریم) | 32 GB | 16 cores | 320 GB | — | — |

> 💡 **Note:** Prices may change. Always verify at [liara.ir/pricing](https://liara.ir/pricing).

#### Recommended Plans for This Project

Based on the Covenant Signing Platform's architecture and expected load (up to 50,000 requests/minute):

| Service | Minimum Plan | Recommended Plan | Why |
|---------|-------------|------------------|-----|
| **PostgreSQL** | 🌍 Earth (0.5 GB) | 🔴 **Mars** (1 GB RAM, 1 core, 10 GB SSD) | Stores all signatures; needs RAM for query caching, disk for data growth. Earth is too tight for production. |
| **Redis** | 🌍 Earth (0.5 GB) | 🌍 **Earth** (0.5 GB RAM, 0.5 core, 5 GB SSD) | Only stores job queue + 10s count cache — very lightweight. Earth is sufficient even at scale. |
| **Next.js Web App** | 🌍 Earth (0.5 GB) | 🔴 **Mars** (1 GB RAM, 1 core, 10 GB SSD) | Next.js standalone needs ~300MB at idle; with concurrent requests, 1GB provides headroom. |
| **Docker Worker** | 🌍 Earth (0.5 GB) | 🌍 **Earth** (0.5 GB RAM, 0.5 core, 5 GB SSD) | Worker is lightweight — reads from Redis, writes to PostgreSQL. 0.5 GB is enough for 50 concurrent jobs. |

**Minimum viable setup (budget-friendly):** All services on Earth plan = ~۱,۴۰۰,۰۰۰ تومان/month

**Recommended production setup:**
```
PostgreSQL  → Mars (1 GB)      → ۶۰۰,۰۰۰ تومان/month
Redis       → Earth (0.5 GB)   → ۳۵۰,۰۰۰ تومان/month
Web App     → Mars (1 GB)      → ۶۰۰,۰۰۰ تومان/month
Worker App  → Earth (0.5 GB)   → ۳۵۰,۰۰۰ تومان/month
─────────────────────────────────────────────────────────
Total                           → ۱,۹۰۰,۰۰۰ تومان/month
```

> 💡 **Scaling tip:** If the web app gets slow under load, upgrade it to **Jupiter** (2 GB). If the worker falls behind on processing, add more worker instances (horizontal scaling) rather than upgrading the plan — BullMQ handles multiple workers automatically.

---

### Phase 1: Create a Liara Account

1. Go to [https://liara.ir](https://liara.ir) and click **ثبت‌نام** (Sign Up)
2. Sign up with your email or phone number
3. Verify your email/phone
4. Complete your profile (name, etc.)
5. Add credit to your account — you can use the dashboard's **شارژ حساب** section. Liara is pay-as-you-go, so you just need enough balance to cover the resources you use.

> 💡 **Tip:** Liara offers a free tier for new accounts. Check their current promotions.

---

### Phase 2: Create a Private Network

All your services (web app, worker, databases) should be on the **same private network** so they can communicate securely without going through the public internet.

1. Log into [Liara Console](https://console.liara.ir)
2. In the left sidebar, go to **شبکه خصوصی** (Private Network)
3. Click **ایجاد شبکه خصوصی** (Create Private Network)
4. Give it a name (e.g., `covenant-net`)
5. Click **ایجاد**

**Or using CLI:**
```bash
npm install -g @liara/cli
liara login
liara network create
```

> ⚠️ **Important:** All your apps and databases MUST be on the same private network to communicate with internal hostnames.

---

### Phase 3: Create the PostgreSQL Database

1. In Liara Console, go to **دیتابیس** (Databases) in the sidebar
2. Click **راه‌اندازی دیتابیس** (Create Database)
3. Select **PostgreSQL**
4. Fill in the form:
   - **نسخه (Version):** Choose the latest (e.g., 16)
   - **شناسه (ID):** e.g., `covenant-pg` (must be unique in your account)
   - **شبکه خصوصی (Private Network):** Select the network you created in Phase 2
   - **منابع سخت‌افزاری (Resources):** 🔴 **Recommended: Mars (مریخ)** — 1 GB RAM, 1 core CPU, 10 GB SSD (~۶۰۰,۰۰۰ تومان/month). This gives PostgreSQL enough RAM for query caching and disk for signature data to grow.
5. Click **راه‌اندازی و نصب دیتابیس** (Create & Install)

**Wait** for the database status to become **آماده به کار** (Ready).

6. After the database is ready, click on it to see its details
7. Go to **نحوه اتصال** (How to Connect) tab
8. You'll see two sets of credentials:
   - **شبکه عمومی (Public Network):** For connecting from outside Liara
   - **شبکه خصوصی (Private Network):** For connecting from within Liara ← **Use this one**

9. **Copy the Private Network connection string** — it looks like:
   ```
   postgresql://covenant_pg:PASSWORD@covenant-pg:5432/postgres
   ```

10. **Initialize the database schema.** From your local machine (with public access enabled temporarily, or using `liara exec`), run:
    ```bash
    # Set DATABASE_URL to the PUBLIC connection string from Liara dashboard
    export DATABASE_URL="postgresql://covenant_pg:YOUR_PASSWORD@PUBLIC_HOST:5432/postgres"

    # Push the Prisma schema
    npx prisma db push
    ```

    > 💡 **Alternative:** You can also enable "دسترسی از طریق شبکه عمومی" (Public Access) temporarily on the database settings, run `prisma db push` from your local machine, then disable public access for security.

**Or using Liara CLI:**
```bash
liara db:create --platform=postgres --id=covenant-pg --network=covenant-net
```

---

### Phase 4: Create the Redis Database

1. In Liara Console, go to **دیتابیس** (Databases)
2. Click **راه‌اندازی دیتابیس** (Create Database)
3. Select **Redis**
4. Fill in the form:
   - **نسخه (Version):** Choose the latest (e.g., 7)
   - **شناسه (ID):** e.g., `covenant-redis` (must be unique in your account)
   - **شبکه خصوصی (Private Network):** Select the **same** network as PostgreSQL
   - **منابع سخت‌افزاری (Resources):** 🌍 **Recommended: Earth (زمین)** — 0.5 GB RAM, 0.5 core CPU, 5 GB SSD (~۳۵۰,۰۰۰ تومان/month). Redis only stores the BullMQ job queue and a 10-second count cache — very lightweight. Earth is sufficient even under high load.
5. Click **راه‌اندازی و نصب دیتابیس** (Create & Install)

**Wait** for the database status to become **آماده به کار** (Ready).

6. After the database is ready, click on it → **نحوه اتصال** (How to Connect)
7. **Copy the Private Network connection string** — it looks like:
   ```
   redis://covenant-redis:6379
   ```

**Or using Liara CLI:**
```bash
liara db:create --platform=redis --id=covenant-redis --network=covenant-net
```

---

### Phase 5: Create the Next.js Web App

1. In Liara Console, go to **پلتفرم** (Platform) in the sidebar
2. Click **ایجاد برنامه** (Create App)
3. Select **NextJS** as the platform
4. Fill in:
   - **شناسه (ID):** e.g., `ahd-babol` (this becomes your default URL: `ahd-babol.liara.run`)
   - **شبکه خصوصی (Private Network):** Select the **same** network
   - **منابع سخت‌افزاری (Resources):** 🔴 **Recommended: Mars (مریخ)** — 1 GB RAM, 1 core CPU, 10 GB SSD (~۶۰۰,۰۰۰ تومان/month). Next.js standalone needs ~300MB at idle; 1 GB gives comfortable headroom for concurrent API requests.
5. Click **ایجاد برنامه** (Create App)

**Or using Liara CLI:**
```bash
liara app:create
# Then select: platform=next, network=covenant-net
```

---

### Phase 6: Create the Worker App (Docker)

The worker needs to run as a **separate** Docker-based app on Liara, since it's a background process (not a web server).

1. In Liara Console, go to **پلتفرم** → **ایجاد برنامه**
2. Select **Docker** as the platform
3. Fill in:
   - **شناسه (ID):** e.g., `ahd-worker`
   - **شبکه خصوصی (Private Network):** Select the **same** network
   - **منابع سخت‌افزاری (Resources):** 🌍 **Recommended: Earth (زمین)** — 0.5 GB RAM, 0.5 core CPU, 5 GB SSD (~۳۵۰,۰۰۰ تومان/month). The worker is lightweight — it reads from Redis and writes to PostgreSQL. 0.5 GB is enough for 50 concurrent jobs. If you need more throughput, scale horizontally (add more instances) rather than upgrading the plan.
4. Click **ایجاد برنامه**

The worker uses `worker.Dockerfile` (already in the project root) which installs dependencies, copies Prisma client and worker source, then runs `npx tsx worker.ts`.

---

### Phase 7: Set Environment Variables

For each app, you need to set environment variables in Liara Console.

#### Web App (ahd-babol) — Environment Variables

Go to your web app → **تنظیمات** (Settings) → **متغیرهای محیطی** (Environment Variables) and add:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `postgresql://covenant_pg:PASSWORD@covenant-pg:5432/postgres` | Use **Private Network** host |
| `REDIS_URL` | `redis://covenant-redis:6379` | Use **Private Network** host |

> ⚠️ **Important:** Use the **private network** hostnames (e.g., `covenant-pg` and `covenant-redis`), NOT the public ones. This ensures secure internal communication.

#### Worker App (ahd-worker) — Environment Variables

Go to your worker app → **تنظیمات** → **متغیرهای محیطی** and add the same:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `postgresql://covenant_pg:PASSWORD@covenant-pg:5432/postgres` | Same as web app |
| `REDIS_URL` | `redis://covenant-redis:6379` | Same as web app |

---

### Phase 8: Deploy via Liara CLI

Since GitHub integration may not always be available, we use the **Liara CLI** to deploy directly from your machine.

> 💡 **If GitHub integration becomes available later**, you can switch to it for automatic deploys on push. See the "Phase 8 Alternative: GitHub Integration" section at the end of this guide.

---

#### 8.1 Prerequisite — Generate `package-lock.json`

> ⚠️ **CRITICAL:** Liara's Next.js platform runs `npm ci` during build, which **requires** `package-lock.json`. If your project only has `bun.lock`, the build will fail with `npm error Exit handler never called!`

**On your local machine:**

```bash
# From the project root directory
npm install
```

This generates a `package-lock.json` file. Verify it exists:

```bash
ls -la package-lock.json
```

> 💡 **If you already use `npm` locally** and have `package-lock.json`, skip this step.
>
> **If you use `bun` locally**, that's fine — just run `npm install` once to generate the lock file. You can continue using `bun` for local development; the `package-lock.json` is only needed by Liara's build system.

**Commit the lock file:**

```bash
git add package-lock.json
git commit -m "chore: add package-lock.json for Liara deployment"
git push
```

---

#### 8.2 Install and Login to Liara CLI

```bash
# Install the Liara CLI globally
npm install -g @liara/cli

# Login to your Liara account
liara login

# Verify you're logged in
liara whoami
```

> 💡 The CLI will open a browser for authentication. If you're on a headless server, use `liara login --apiKey=YOUR_API_KEY` instead (get your API key from Liara Console → Profile → API Keys).

---

#### 8.3 Deploy the Next.js Web App

```bash
# From the project root directory
liara deploy --app=ahd-babol --platform=next
```

**What happens during deployment:**
1. Liara CLI uploads your project files (compressed)
2. Liara's build server runs `npm ci` to install dependencies
3. Then runs `npm run build` → `next build` (with `output: "standalone"`)
4. Starts the app with `node .next/standalone/server.js` on port 3000

**Watch the build logs** in Liara Console → `ahd-babol` → **استقرار** (Deployments).

**When it succeeds**, your web app is live at: `https://ahd-babol.liara.run`

> 💡 **First deployment takes 2-5 minutes** (installing all dependencies + building Next.js). Subsequent deploys are faster thanks to caching.

**Common build errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `npm ci` command failed | Missing `package-lock.json` | Run `npm install` locally, then deploy again |
| `npm error Exit handler never called!` | Corrupted or missing lock file | Delete `node_modules` + `package-lock.json`, run `npm install` fresh |
| Out of memory (OOM) | Earth plan (0.5 GB) is too small for Next.js build | Upgrade to **Mars** (1 GB) plan |
| Build succeeds but 502 on visit | Missing `output: "standalone"` in next.config.ts | Already set ✅ — check env vars |

---

#### 8.4 Deploy the Worker App (Docker)

The worker is a **separate Docker app** that runs `worker.ts` in the background. It reads jobs from Redis and writes to PostgreSQL.

```bash
# Deploy the worker as a Docker app
liara deploy --app=ahd-worker --platform=docker --dockerfile=worker.Dockerfile
```

**What the `worker.Dockerfile` does:**

```
┌──────────────────────────────────────────────┐
│ Stage 1: deps                                │
│   COPY package.json + package-lock.json      │
│   npm ci --omit=dev  (production deps only)  │
├──────────────────────────────────────────────┤
│ Stage 2: builder                             │
│   npm ci  (all deps including dev)           │
│   COPY prisma/ → npx prisma generate         │
├──────────────────────────────────────────────┤
│ Stage 3: runner (final image)                │
│   COPY node_modules from deps                │
│   COPY .prisma/ from builder                 │
│   COPY worker.ts + prisma/ + package.json    │
│   npm install -g tsx                         │
│   CMD ["npx", "tsx", "worker.ts"]            │
└──────────────────────────────────────────────┘
```

**Verify the worker is running** — check logs in Liara Console → `ahd-worker` → **لاگ‌ها** (Logs). You should see:

```
[Worker] Connected to Redis
[Worker] 🚀 Worker ready — listening to queue "signatures" (concurrency: 50)
[Worker] Redis: redis://covenant-redis:6379
[Worker] Database: postgresql://covenant_pg:****@covenant-pg:5432/postgres
```

> ⚠️ **If you see connection errors** in the worker logs, check:
> 1. Are all services on the **same private network**?
> 2. Are env vars using **private network** hostnames (e.g., `covenant-pg` not the public host)?
> 3. Is the PostgreSQL database **running** (check status in Liara Console)?

---

#### 8.5 Deploy Summary & Cheat Sheet

```bash
# ─── One-time setup ───────────────────────────
npm install -g @liara/cli     # Install CLI
liara login                   # Login
npm install                   # Generate package-lock.json (if missing)

# ─── Deploy web app ──────────────────────────
liara deploy --app=ahd-babol --platform=next

# ─── Deploy worker ───────────────────────────
liara deploy --app=ahd-worker --platform=docker --dockerfile=worker.Dockerfile

# ─── Check status ────────────────────────────
liara app:logs --app=ahd-babol       # Web app logs
liara app:logs --app=ahd-worker      # Worker logs
```

---

### Phase 8 Alternative: Deploy via GitHub Integration

> 💡 Use this method **only** if GitHub integration becomes available. It provides automatic deploys on every git push.

#### Connect Liara to GitHub

1. In Liara Console, click your **profile** (top right) → **حساب کاربری** (Account Settings)
2. Go to **گیت‌هاب** (GitHub) section
3. Click **اتصال به گیت‌هاب** (Connect to GitHub)
4. Authorize Liara to access your GitHub account
5. Select the repository: `Airya-Xratu/ahd_babol`

#### Deploy the Web App via GitHub

1. Go to your web app (`ahd-babol`) in Liara Console
2. Go to **استقرار** (Deployments) tab
3. Click **استقرار جدید** (New Deployment)
4. Select **GitHub** as the source
5. Choose the repository and branch (`main`)
6. Click **استقرار** (Deploy)

#### Deploy the Worker via GitHub

1. Go to your worker app (`ahd-worker`) in Liara Console
2. Go to **استقرار** → **استقرار جدید**
3. Select **GitHub** as the source
4. Choose the same repository and branch (`main`)
5. **Set the Dockerfile path** to `worker.Dockerfile`
6. Click **استقرار** (Deploy)

> ⚠️ **Important:** When deploying via GitHub, do NOT include the `app` or `platform` fields in `liara.json`. Liara auto-detects these.

---

### Phase 9: Connect a Custom Domain & Enable SSL

#### 9.1 Add Your Domain

1. Go to your web app (`ahd-babol`) in Liara Console
2. Go to **تنظیمات** (Settings) → **دامنه‌ها** (Domains)
3. Click **افزودن دامنه** (Add Domain)
4. Enter your domain name (e.g., `ahd-babol.ir` or `bayat.mydomain.com`)
5. Click **افزودن**

#### 9.2 Configure DNS Records

Liara will show you the DNS records you need to add at your domain registrar. Typically:

**For a root domain (e.g., `ahd-babol.ir`):**
| Type | Name | Value |
|------|------|-------|
| CNAME | `@` | `ahd-babol.liara.run` |

**For a subdomain (e.g., `bayat.mydomain.com`):**
| Type | Name | Value |
|------|------|-------|
| CNAME | `bayat` | `ahd-babol.liara.run` |

> 💡 Go to your domain registrar's DNS management panel and add the record Liara provides.

#### 9.3 Add www Subdomain (Optional)

1. In the same Domains section, click **افزودن زیردامنه www**
2. Add a CNAME record:
   | Type | Name | Value |
   |------|------|-------|
   | CNAME | `www` | `ahd-babol.liara.run` |

#### 9.4 Enable SSL Certificate

1. In the Domains section, find your custom domain
2. Click **تهیه گواهی SSL** (Provision SSL Certificate)
3. Liara automatically provisions a free SSL certificate (Let's Encrypt)
4. The SSL certificate will be auto-renewed by Liara — no maintenance needed!

> ✅ That's it! Your site is now live at `https://yourdomain.ir` with HTTPS.

#### 9.5 Disable Default Subdomain (Optional)

If you want to disable the default `ahd-babol.liara.run` URL so only your custom domain works:

1. In the Domains section, find the default subdomain
2. Click **غیرفعال کردن** (Disable)

---

### Phase 10: Verify Everything Works

1. **Visit your site** at `https://yourdomain.ir`
2. **Click "ورود و بیعت"** to enter the content page
3. **Fill the form** and submit
4. **API returns 202** — job is queued in Redis
5. **Check worker logs** in Liara Console → worker app → **لاگ‌ها** (Logs)
   - You should see: `✓ Job xxx — FirstName LastName (nationalCode)`
6. **Refresh the page** — the count should update (after 10s Redis cache TTL)

---

### 🔧 Liara-Specific Troubleshooting

#### Build Fails on Liara (`npm ci` error)

- **Most common cause:** Missing `package-lock.json` — Liara's Next.js platform runs `npm ci` which requires it
- **Fix:** Run `npm install` locally to generate `package-lock.json`, then deploy again
- Make sure `package.json` has standard `build` and `start` scripts
- Make sure `next.config.ts` has `output: "standalone"` ✅ (already set)
- Remove `node_modules` from git — Liara installs dependencies during build
- If `npm ci` still fails after generating lock file, try: `rm -rf node_modules package-lock.json && npm install`
- **Earth plan (0.5 GB RAM)** may cause OOM during Next.js build — upgrade to **Mars** (1 GB)

#### Worker Can't Connect to PostgreSQL/Redis

- Verify all services are on the **same private network**
- Use **private network** hostnames (e.g., `covenant-pg`, `covenant-redis`), not public ones
- Check environment variables in the worker app settings

#### "Connection refused" Errors

- Make sure the database is **running** (check status in Liara Console)
- Check that the private network hostname matches the database ID
- For PostgreSQL: the default database name is `postgres`, not `covenant_db`

#### Custom Domain Not Working

- DNS propagation can take up to **48 hours** (usually much faster)
- Verify your CNAME record points to the correct `liara.run` address
- Use `dig yourdomain.ir` or [dnschecker.org](https://dnschecker.org) to check DNS propagation

#### SSL Certificate Won't Provision

- Make sure DNS is fully propagated first
- Try clicking "تهیه گواهی SSL" again after DNS is confirmed
- Check that no other service is using port 80 on the domain (needed for ACME challenge)

---

### 💰 Cost Estimation on Liara

#### Minimum Viable Setup (Budget-Friendly)

All services on **Earth (زمین)** plan:

| Resource | Plan | RAM | Monthly Cost |
|----------|------|-----|-------------|
| PostgreSQL DB | Earth | 0.5 GB | ۳۵۰,۰۰۰ تومان |
| Redis DB | Earth | 0.5 GB | ۳۵۰,۰۰۰ تومان |
| Next.js Web App | Earth | 0.5 GB | ۳۵۰,۰۰۰ تومان |
| Docker Worker App | Earth | 0.5 GB | ۳۵۰,۰۰۰ تومان |
| **Total** | | **2 GB** | **~۱,۴۰۰,۰۰۰ تومان/month** |

> ⚠️ **Warning:** Earth plan for Next.js may cause OOM (Out of Memory) errors under load. Only use this for testing/light traffic.

#### Recommended Production Setup

| Resource | Plan | RAM | CPU | Disk | Monthly Cost |
|----------|------|-----|-----|------|-------------|
| PostgreSQL DB | 🔴 Mars | 1 GB | 1 core | 10 GB SSD | ۶۰۰,۰۰۰ تومان |
| Redis DB | 🌍 Earth | 0.5 GB | 0.5 core | 5 GB SSD | ۳۵۰,۰۰۰ تومان |
| Next.js Web App | 🔴 Mars | 1 GB | 1 core | 10 GB SSD | ۶۰۰,۰۰۰ تومان |
| Docker Worker App | 🌍 Earth | 0.5 GB | 0.5 core | 5 GB SSD | ۳۵۰,۰۰۰ تومان |
| **Total** | | **3 GB** | **3 cores** | **30 GB SSD** | **~۱,۹۰۰,۰۰۰ تومان/month** |

#### High-Traffic Setup (10K+ concurrent users)

| Resource | Plan | RAM | CPU | Disk | Monthly Cost |
|----------|------|-----|-----|------|-------------|
| PostgreSQL DB | Jupiter | 2 GB | 1 core | 20 GB SSD | ۱,۰۵۰,۰۰۰ تومان |
| Redis DB | 🌍 Earth | 0.5 GB | 0.5 core | 5 GB SSD | ۳۵۰,۰۰۰ تومان |
| Next.js Web App | Jupiter | 2 GB | 1 core | 20 GB SSD | ۱,۰۵۰,۰۰۰ تومان |
| Docker Worker App | 🔴 Mars | 1 GB | 1 core | 10 GB SSD | ۶۰۰,۰۰۰ تومان |
| **Total** | | **5.5 GB** | **3.5 cores** | **55 GB SSD** | **~۳,۰۵۰,۰۰۰ تومان/month** |

> 💡 **Note:** All prices are approximate monthly rates based on Liara's current pricing (as of 1404). Liara also charges hourly, so you only pay for what you use. Always verify at [liara.ir/pricing](https://liara.ir/pricing).

---

### 📈 Scaling on Liara

- **Web App:** Scale vertically (more RAM/CPU) or horizontally (more instances) from the app settings
- **Worker:** Scale horizontally — just increase the instance count. BullMQ handles multiple workers automatically
- **Databases:** Scale vertically from the database settings. For PostgreSQL, you can also enable connection pooling

---

## 🔧 Local Development Troubleshooting

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
