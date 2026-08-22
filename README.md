# Kevtech -- AI Business Operating System

The AI employee for your business. Multi-tenant AI Business Operating System with WhatsApp integration, automation engine, and sector-specific dashboards.

## Deploy on Vercel (Recommended)

### 1. Create a PostgreSQL Database

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Storage" -> "Create Database" -> "Postgres"
3. Name it `kevtech-db`
4. Copy the `DATABASE_URL` connection string

### 2. Set Environment Variables in Vercel

In your Vercel project settings -> Environment Variables, add:

```
DATABASE_URL=postgresql://your-connection-string
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=kevtech-secret-7f3a9e2b1c8d4f6a
```

### 3. Deploy

1. Push code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel auto-detects Next.js and runs `bun run build`
5. Database tables are created automatically on first signup

## Local Development

```bash
bun install
bun run db:push
bun run dev
```

Open http://localhost:3000

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Prisma ORM (PostgreSQL)
- NextAuth.js
- Direct Z.ai API calls (no SDK needed)

## Created by

Kelvin Ayinbisa
