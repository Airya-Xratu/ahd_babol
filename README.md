# 🏛️ پلتفرم بیعت‌نامه — Covenant Signing Platform

A high-performance covenant signing platform built with **Next.js 16**, **PostgreSQL**, **Redis**, and **BullMQ**.

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
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── queue.ts           # BullMQ queue definition
│   │   ├── redis.ts           # Redis client singleton
│   │   └── validators.ts      # Zod validation schema (Persian errors)
│   └── instrumentation.ts     # BullMQ worker (starts with Next.js server)
├── worker.ts                  # Standalone worker (optional, for local dev)
├── liara.json                 # Liara config for Next.js web app
├── docker-compose.yml         # PostgreSQL + Redis (local development)
├── .env.local.example         # Environment template
└── package.json
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [🏗️ Architecture](docs/architecture.md) | How the system works, flow diagram, performance characteristics |
| [🚀 Getting Started](docs/getting-started.md) | Quick start, dev commands, Docker reference |
| [🔌 API Endpoints](docs/api.md) | POST /api/sign, GET /api/count, validation rules |
| [⚙️ Configuration](docs/configuration.md) | Environment variables, worker settings, Next.js config |
| [🚢 Liara Deployment](docs/liara-deployment.md) | Complete step-by-step deployment guide on Liara |
| [🔧 Troubleshooting](docs/troubleshooting.md) | Local dev & Liara deployment troubleshooting |

## 📝 License

Private — All rights reserved.
