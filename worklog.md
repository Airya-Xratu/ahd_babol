---
Task ID: 1
Agent: Main Agent
Task: Build Covenant Signing Platform - Complete Implementation

Work Log:
- Updated Prisma schema with Signature model (id, firstName, lastName, nationalCode @unique, mobile, signedAt, createdAt)
- Pushed schema to SQLite database and generated Prisma client
- Created Zod v4 validation schema with Persian error messages for all fields
- Created in-memory cache utility with TTL support (replaces Redis for count caching)
- Created POST /api/sign route with Zod validation, duplicate detection (P2002), and cache invalidation
- Created GET /api/count route with 10-second in-memory cache
- Fixed Zod v4 compatibility issue (.issues instead of .errors)
- Generated AI background image (background.jpg) and header image (header.jpg) for the UI
- Built full frontend page with:
  - Landing screen with full-screen background image, dark overlay, animated button with pulse-glow effect
  - Slide-up animation to content page using Framer Motion AnimatePresence
  - Header image section with gradient overlay and title
  - Signature count bar with auto-refresh every 10 seconds
  - Covenant text section in card layout
  - Two-column responsive form (desktop) / single column (mobile) with:
    - Name, family name, national code (10 digits), mobile (11 digits, starts with 09)
    - Client-side validation with Persian error messages
    - Success/error feedback messages with animations
    - Loading state with spinner during submission
  - Floating action button (bottom-right) to scroll to form
  - Sticky footer with mt-auto
  - RTL layout support (lang="fa" dir="rtl")
- Removed unused imports (ChevronUp), fixed floating button position for RTL

Stage Summary:
- All API endpoints working: POST /api/sign (201, 400, 409), GET /api/count (200)
- Lint passes cleanly
- Dev server running on port 3000
- Database: SQLite via Prisma with unique nationalCode constraint
- Cache: In-memory with 10s TTL for count endpoint
- UI: Full Persian/RTL interface with Framer Motion animations
- Images: AI-generated background.jpg and header.jpg in public/
