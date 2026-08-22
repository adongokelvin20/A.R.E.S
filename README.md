# A.R.E.S. -- by Kevtech

**Automated Routing and Execution System**

The AI employee for your business. Multi-tenant AI Business Operating System with WhatsApp integration, automation engine, and sector-specific dashboards.

**Created by Kelvin Ayinbisa · Kevtech**

## Deploy on Vercel

### 1. Create a PostgreSQL Database
1. Go to https://vercel.com/dashboard -> Storage -> Create Database -> Postgres
2. Name it `ares-db`
3. Copy the `DATABASE_URL` connection string

### 2. Set Environment Variables
In Vercel project settings -> Environment Variables, add:
```
DATABASE_URL=postgresql://your-connection-string
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=kevtech-secret-7f3a9e2b1c8d4f6a
```

### 3. Deploy
1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Click Deploy
5. Database tables are created automatically on first signup

## Local Development
```bash
bun install
bun run db:push
bun run dev
```

## Tech Stack
- Next.js 16 (App Router)
- TypeScript / Tailwind CSS 4
- Prisma ORM (PostgreSQL)
- NextAuth.js
- Direct Z.ai API calls
- Rate limiting + security headers
- Sitemap + SEO optimized

## Legal
- Terms of Service
- Privacy Policy
- Refund Policy
- Cookie Policy

## Company
**Kevtech** -- Building AI tools for African businesses.

## Created by
Kelvin Ayinbisa
