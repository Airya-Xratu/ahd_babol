# 🚢 Liara Deployment Guide

Complete step-by-step guide to deploy the Covenant Signing Platform to [Liara](https://liara.ir).

## Liara Plan Reference

Liara uses planet-named plans for both apps and databases. Here are all available tiers:

### App (PaaS) Plans

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

### Database (DBaaS) Plans

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

### Recommended Plans for This Project

| Service | Minimum Plan | Recommended Plan | Why |
|---------|-------------|------------------|-----|
| **PostgreSQL** | 🌍 Earth (0.5 GB) | 🔴 **Mars** (1 GB RAM, 1 core, 10 GB SSD) | Stores all signatures; needs RAM for query caching, disk for data growth |
| **Redis** | 🌍 Earth (0.5 GB) | 🌍 **Earth** (0.5 GB RAM, 0.5 core, 5 GB SSD) | Only stores job queue + 10s count cache — very lightweight |
| **Next.js Web App** | 🌍 Earth (0.5 GB) | 🔴 **Mars** (1 GB RAM, 1 core, 10 GB SSD) | Next.js standalone + embedded BullMQ worker. ~400MB at idle |

**Recommended production setup:**
```
PostgreSQL  → Mars (1 GB)      → ۶۰۰,۰۰۰ تومان/month
Redis       → Earth (0.5 GB)   → ۳۵۰,۰۰۰ تومان/month
Web App     → Mars (1 GB)      → ۶۰۰,۰۰۰ تومان/month
─────────────────────────────────────────────────────────
Total                           → ۱,۵۵۰,۰۰۰ تومان/month
```

---

## Phase 1: Create a Liara Account

1. Go to [https://liara.ir](https://liara.ir) and click **ثبت‌نام** (Sign Up)
2. Sign up with your email or phone number
3. Verify your email/phone
4. Complete your profile (name, etc.)
5. Add credit to your account — you can use the dashboard's **شارژ حساب** section. Liara is pay-as-you-go, so you just need enough balance to cover the resources you use.

> 💡 **Tip:** Liara offers a free tier for new accounts. Check their current promotions.

---

## Phase 2: Create a Private Network

All your services (web app, databases) should be on the **same private network** so they can communicate securely without going through the public internet.

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

## Phase 3: Create the PostgreSQL Database

1. In Liara Console, go to **دیتابیس** (Databases) in the sidebar
2. Click **راه‌اندازی دیتابیس** (Create Database)
3. Select **PostgreSQL**
4. Fill in the form:
   - **نسخه (Version):** Choose the latest (e.g., 16)
   - **شناسه (ID):** e.g., `covenant-pg` (must be unique in your account)
   - **شبکه خصوصی (Private Network):** Select the network you created in Phase 2
   - **منابع سخت‌افزاری (Resources):** 🔴 **Recommended: Mars (مریخ)** — 1 GB RAM, 1 core CPU, 10 GB SSD
5. Click **راه‌اندازی و نصب دیتابیس** (Create & Install)

**Wait** for the database status to become **آماده به کار** (Ready).

6. After the database is ready, click on it → **نحوه اتصال** (How to Connect)
7. **Copy the Private Network connection string** — it looks like:
   ```
   postgresql://covenant_pg:PASSWORD@covenant-pg:5432/postgres
   ```

8. **Initialize the database schema.** From your local machine:
   ```bash
   export DATABASE_URL="postgresql://covenant_pg:YOUR_PASSWORD@PUBLIC_HOST:5432/postgres"
   npx prisma db push
   ```

   > 💡 Enable "دسترسی از طریق شبکه عمومی" (Public Access) temporarily on the database settings, run `prisma db push` from your local machine, then disable public access for security.

**Or using Liara CLI:**
```bash
liara db:create --platform=postgres --id=covenant-pg --network=covenant-net
```

---

## Phase 4: Create the Redis Database

1. In Liara Console, go to **دیتابیس** (Databases)
2. Click **راه‌اندازی دیتابیس** (Create Database)
3. Select **Redis**
4. Fill in the form:
   - **نسخه (Version):** Choose the latest (e.g., 7)
   - **شناسه (ID):** e.g., `covenant-redis`
   - **شبکه خصوصی (Private Network):** Select the **same** network as PostgreSQL
   - **منابع سخت‌افزاری (Resources):** 🌍 **Recommended: Earth (زمین)** — 0.5 GB RAM
5. Click **راه‌اندازی و نصب دیتابیس** (Create & Install)

6. After the database is ready, click on it → **نحوه اتصال** (How to Connect)
7. **Copy the Private Network connection string** — it looks like:
   ```
   redis://covenant-redis:6379
   ```

---

## Phase 5: Create the Next.js Web App

1. In Liara Console, go to **پلتفرم** (Platform) in the sidebar
2. Click **ایجاد برنامه** (Create App)
3. Select **NextJS** as the platform
4. Fill in:
   - **شناسه (ID):** e.g., `ahd-babol` (this becomes your default URL: `ahd-babol.liara.run`)
   - **شبکه خصوصی (Private Network):** Select the **same** network
   - **منابع سخت‌افزاری (Resources):** 🔴 **Recommended: Mars (مریخ)** — 1 GB RAM
5. Click **ایجاد برنامه** (Create App)

---

## Phase 6: Set Environment Variables

Go to your web app (`ahd-babol`) → **تنظیمات** (Settings) → **متغیرهای محیطی** (Environment Variables) and add:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `postgresql://covenant_pg:PASSWORD@covenant-pg:5432/postgres` | Use **Private Network** host |
| `REDIS_URL` | `redis://covenant-redis:6379` | Use **Private Network** host |

> ⚠️ **Important:** Use the **private network** hostnames (e.g., `covenant-pg` and `covenant-redis`), NOT the public ones.
>
> 💡 Since the BullMQ worker runs **inside** the Next.js app via `instrumentation.ts`, you only need to set env vars on the **web app** — no separate worker app needed!

---

## Phase 7: Deploy via Liara CLI

### 7.1 Prerequisite — Generate `package-lock.json`

> ⚠️ **CRITICAL:** Liara's Next.js platform runs `npm ci` during build, which **requires** `package-lock.json**.

```bash
# From the project root directory
npm install
```

This generates a `package-lock.json` file.

> 💡 If you use `bun` locally, that's fine — just run `npm install` once to generate the lock file. You can continue using `bun` for local development.

**Commit the lock file:**

```bash
git add package-lock.json
git commit -m "chore: add package-lock.json for Liara deployment"
git push
```

### 7.2 Install and Login to Liara CLI

```bash
npm install -g @liara/cli
liara login
liara whoami
```

> 💡 If you're on a headless server, use `liara login --apiKey=YOUR_API_KEY` instead.

### 7.3 Deploy the Next.js Web App

```bash
liara deploy --app=ahd-babol --platform=next
```

**What happens during deployment:**
1. Liara CLI uploads your project files (compressed)
2. Liara's build server runs `npm ci` to install dependencies
3. Then runs `npm run build` → `next build` (with `output: "standalone"`)
4. Starts the app with `node .next/standalone/server.js` on port 3000

**When it succeeds**, your web app is live at: `https://ahd-babol.liara.run`

**Common build errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `npm ci` command failed | Missing `package-lock.json` | Run `npm install` locally, then deploy again |
| `npm error Exit handler never called!` | Corrupted or missing lock file | Delete `node_modules` + `package-lock.json`, run `npm install` fresh |
| Out of memory (OOM) | Earth plan (0.5 GB) too small | Upgrade to **Mars** (1 GB) plan |
| Build succeeds but 502 on visit | Missing env vars | Check `DATABASE_URL` and `REDIS_URL` |

### 7.4 Verify the Worker Started

After deployment, the BullMQ worker starts **automatically** inside Next.js via `instrumentation.ts`. Check logs in Liara Console → `ahd-babol` → **لاگ‌ها** (Logs):

```
[Worker] Connected to Redis
[Worker] 🚀 Worker ready — listening to queue "signatures" (concurrency: 50)
```

> ⚠️ **If you see connection errors**, check:
> 1. Are all services on the **same private network**?
> 2. Are env vars using **private network** hostnames?
> 3. Is the PostgreSQL database **running**?

### 7.5 Deploy Cheat Sheet

```bash
# One-time setup
npm install -g @liara/cli
liara login
npm install                    # Generate package-lock.json

# Deploy (only one command!)
liara deploy --app=ahd-babol --platform=next

# Check status
liara app:logs --app=ahd-babol
```

---

## Phase 7 Alternative: Deploy via GitHub Integration

> 💡 Use this method **only** if GitHub integration becomes available.

### Connect Liara to GitHub

1. In Liara Console, click your **profile** → **حساب کاربری** → **گیت‌هاب**
2. Click **اتصال به گیت‌هاب** (Connect to GitHub)
3. Authorize Liara to access your GitHub account
4. Select the repository: `Airya-Xratu/ahd_babol`

### Deploy the Web App via GitHub

1. Go to your web app (`ahd-babol`) → **استقرار** → **استقرار جدید**
2. Select **GitHub** as the source
3. Choose the repository and branch (`main`)
4. Click **استقرار** (Deploy)

> ⚠️ When deploying via GitHub, do NOT include `app` or `platform` fields in `liara.json`.
>
> 💡 The BullMQ worker starts automatically with the web app — no separate deployment needed!

---

## Phase 8: Connect a Custom Domain & Enable SSL

### 8.1 Add Your Domain

1. Go to your web app → **تنظیمات** → **دامنه‌ها** (Domains)
2. Click **افزودن دامنه** (Add Domain)
3. Enter your domain name (e.g., `ahd-babol.ir`)
4. Click **افزودن**

### 8.2 Configure DNS Records

**For a root domain (e.g., `ahd-babol.ir`):**
| Type | Name | Value |
|------|------|-------|
| CNAME | `@` | `ahd-babol.liara.run` |

**For a subdomain (e.g., `bayat.mydomain.com`):**
| Type | Name | Value |
|------|------|-------|
| CNAME | `bayat` | `ahd-babol.liara.run` |

### 8.3 Add www Subdomain (Optional)

Add a CNAME record: `www` → `ahd-babol.liara.run`

### 8.4 Enable SSL Certificate

1. In the Domains section, find your custom domain
2. Click **تهیه گواهی SSL** (Provision SSL Certificate)
3. Liara provisions a free Let's Encrypt certificate (auto-renewed)

### 8.5 Disable Default Subdomain (Optional)

Find the default `ahd-babol.liara.run` subdomain and click **غیرفعال کردن** (Disable).

---

## Phase 9: Verify Everything Works

1. **Visit your site** at `https://yourdomain.ir`
2. **Click "ورود و بیعت"** to enter the content page
3. **Fill the form** and submit
4. **API returns 202** — job is queued in Redis
5. **Check logs** in Liara Console → `ahd-babol` → **لاگ‌ها** (Logs)
   - You should see: `[Worker] ✓ Job xxx — FirstName LastName (nationalCode)`
6. **Refresh the page** — the count should update (after 10s Redis cache TTL)

---

## 💰 Cost Estimation

### Minimum Viable Setup (Budget-Friendly)

All services on **Earth (زمین)** plan:

| Resource | Plan | RAM | Monthly Cost |
|----------|------|-----|-------------|
| PostgreSQL DB | Earth | 0.5 GB | ۳۵۰,۰۰۰ تومان |
| Redis DB | Earth | 0.5 GB | ۳۵۰,۰۰۰ تومان |
| Next.js Web App (+ Worker) | Earth | 0.5 GB | ۳۵۰,۰۰۰ تومان |
| **Total** | | **1.5 GB** | **~۱,۰۵۰,۰۰۰ تومان/month** |

### Recommended Production Setup

| Resource | Plan | RAM | CPU | Disk | Monthly Cost |
|----------|------|-----|-----|------|-------------|
| PostgreSQL DB | 🔴 Mars | 1 GB | 1 core | 10 GB SSD | ۶۰۰,۰۰۰ تومان |
| Redis DB | 🌍 Earth | 0.5 GB | 0.5 core | 5 GB SSD | ۳۵۰,۰۰۰ تومان |
| Next.js Web App (+ Worker) | 🔴 Mars | 1 GB | 1 core | 10 GB SSD | ۶۰۰,۰۰۰ تومان |
| **Total** | | **2.5 GB** | **2.5 cores** | **25 GB SSD** | **~۱,۵۵۰,۰۰۰ تومان/month** |

### High-Traffic Setup (10K+ concurrent users)

| Resource | Plan | RAM | CPU | Disk | Monthly Cost |
|----------|------|-----|-----|------|-------------|
| PostgreSQL DB | Jupiter | 2 GB | 1 core | 20 GB SSD | ۱,۰۵۰,۰۰۰ تومان |
| Redis DB | 🌍 Earth | 0.5 GB | 0.5 core | 5 GB SSD | ۳۵۰,۰۰۰ تومان |
| Next.js Web App (+ Worker) | Jupiter | 2 GB | 1 core | 20 GB SSD | ۱,۰۵۰,۰۰۰ تومان |
| **Total** | | **4.5 GB** | **2.5 cores** | **45 GB SSD** | **~۲,۴۵۰,۰۰۰ تومان/month** |

---

## 📈 Scaling on Liara

- **Web App + Worker:** Scale vertically (more RAM/CPU) or horizontally (more instances). BullMQ handles multiple workers automatically when you scale horizontally.
- **Databases:** Scale vertically from the database settings. For PostgreSQL, you can also enable connection pooling.
