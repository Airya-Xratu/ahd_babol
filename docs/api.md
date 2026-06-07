# 🔌 API Endpoints

## `POST /api/sign`

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

### Validation Rules

All errors are returned in Persian. The validation schema is defined in `src/lib/validators.ts` using Zod.

| Field | Rules |
|-------|-------|
| `firstName` | Required, non-empty string |
| `lastName` | Required, non-empty string |
| `nationalCode` | Required, exactly 10 digits, passes checksum validation |
| `mobile` | Required, starts with `09`, exactly 11 digits |

---

## `GET /api/count`

Get the confirmed signature count (cached in Redis for 10 seconds).

**Response (200):**
```json
{
  "confirmed": 12345,
  "count": 12345
}
```

### Caching Behavior

- First request: queries PostgreSQL, caches result in Redis for 10 seconds
- Subsequent requests within 10s: returns cached count from Redis (~2ms)
- After 10s: cache expires, next request hits PostgreSQL again

If Redis is unavailable, the endpoint falls back to querying PostgreSQL directly (slower but still works).
