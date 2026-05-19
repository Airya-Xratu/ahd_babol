# 🔧 Troubleshooting

## Local Development

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

1. The worker starts automatically with `npm run dev` via `instrumentation.ts` — check console for `[Worker] 🚀 Worker ready`
2. Alternatively, run the standalone worker: `npm run worker`
3. Check Redis connectivity: `docker exec -it covenant_redis redis-cli ping`

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

## Liara Deployment

### Build Fails on Liara (`npm ci` error)

- **Most common cause:** Missing `package-lock.json` — Liara's Next.js platform runs `npm ci` which requires it
- **Fix:** Run `npm install` locally to generate `package-lock.json`, then deploy again
- Make sure `package.json` has standard `build` and `start` scripts
- Make sure `next.config.ts` has `output: "standalone"` ✅ (already set)
- Remove `node_modules` from git — Liara installs dependencies during build
- If `npm ci` still fails after generating lock file, try: `rm -rf node_modules package-lock.json && npm install`
- **Earth plan (0.5 GB RAM)** may cause OOM during Next.js build — upgrade to **Mars** (1 GB)

### Worker Can't Connect to PostgreSQL/Redis

- Verify all services are on the **same private network**
- Use **private network** hostnames (e.g., `covenant-pg`, `covenant-redis`), not public ones
- Check environment variables in the web app settings
- The worker runs inside Next.js — check the web app logs, not a separate worker app

### "Connection refused" Errors

- Make sure the database is **running** (check status in Liara Console)
- Check that the private network hostname matches the database ID
- For PostgreSQL: the default database name is `postgres`, not `covenant_db`

### Custom Domain Not Working

- DNS propagation can take up to **48 hours** (usually much faster)
- Verify your CNAME record points to the correct `liara.run` address
- Use `dig yourdomain.ir` or [dnschecker.org](https://dnschecker.org) to check DNS propagation

### SSL Certificate Won't Provision

- Make sure DNS is fully propagated first
- Try clicking "تهیه گواهی SSL" again after DNS is confirmed
- Check that no other service is using port 80 on the domain (needed for ACME challenge)
