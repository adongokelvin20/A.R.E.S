# A.R.E.S. -- Automated Routing and Execution System

The AI employee for your business. Multi-tenant AI Business Operating System with WhatsApp integration, automation engine, and sector-specific dashboards.

## Deploy on Vercel (Recommended)

### 1. Create a PostgreSQL Database

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Storage" -> "Create Database"
3. Choose "Postgres" (Neon or Vercel Postgres)
4. Name it `ares-db`
5. Copy the `DATABASE_URL` connection string

### 2. Set Environment Variables in Vercel

In your Vercel project settings, add these environment variables:

```
DATABASE_URL=postgresql://your-connection-string
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-secret-key
```

Generate a secure NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

### 3. Deploy

1. Push this code to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel will auto-detect Next.js and run `bun run build`
5. The `postinstall` script will automatically generate the Prisma client
6. After deployment, run the database migration:

```bash
# Using Vercel CLI
npx vercel env pull .env
npx prisma db push
```

Or use the Vercel dashboard -> Storage -> your database -> "Connect to project"

### 4. Push the Database Schema

After your first deployment, push the Prisma schema to create the tables:

```bash
npx vercel env pull .env
npx prisma db push
```

Your app is now live!

---

## Local Development

```bash
# 1. Install dependencies
bun install

# 2. Set up the database
# Edit .env to use SQLite for local dev:
# DATABASE_URL=file:./db/custom.db
bun run db:push

# 3. Start the dev server
bun run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | Your app URL | `https://your-app.vercel.app` |
| `NEXTAUTH_SECRET` | Random secret for JWT signing | `openssl rand -base64 32` |

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4
- Prisma ORM (PostgreSQL)
- NextAuth.js (credentials provider)
- z-ai-web-dev-sdk (AI + vision)

## How Images Work

Product images are stored in the database as base64 and served via `/api/image/[id]`. This works on Vercel where the filesystem is read-only.

## Legal

- [Terms of Service](./legal/terms)
- [Privacy Policy](./legal/privacy)
- [Refund Policy](./legal/refund)
- [Cookie Policy](./legal/cookies)

## Created by

Kelvin Ayinbisa
