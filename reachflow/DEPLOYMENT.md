# ReachFlow — Local Development Setup

## Prerequisites

- Node.js 20+ (https://nodejs.org)
- PostgreSQL 14+ OR Docker
- Redis 7+ OR Docker

---

## Quickstart with Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/yourorg/reachflow.git
cd reachflow

# 2. Copy environment file
cp .env.example .env.local
# Edit .env.local — the defaults work for Docker local dev

# 3. Start services
docker-compose up -d db redis

# 4. Install dependencies
npm install

# 5. Generate Prisma client + push schema
npm run db:generate
npm run db:push

# 6. Seed demo data
npm run db:seed

# 7. Start the app
npm run dev
```

Open: **http://localhost:3000**

Demo login:
- Email: `demo@reachflow.app`
- Password: `demo123456`

---

## Without Docker (Manual)

### 1. Install PostgreSQL

Create database: `createdb reachflow`

### 2. Install Redis

Windows: Use https://github.com/microsoftarchive/redis/releases

### 3. Set environment variables

Copy `.env.example` to `.env.local` and update:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/reachflow"
REDIS_URL="redis://localhost:6379"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
DEMO_MODE=true
```

### 4. Install and run

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type check |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run worker` | Start background worker |
| `npm run test` | Run tests |

---

## Enabling Real Providers

### WhatsApp
1. Create Meta Developer account
2. Set up WhatsApp Business API app
3. Add to `.env.local`:
   ```
   WHATSAPP_ACCESS_TOKEN=your_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id
   DEMO_MODE=false
   ```

### Email (Resend)
1. Sign up at resend.com
2. Add to `.env.local`:
   ```
   EMAIL_PROVIDER=resend
   EMAIL_API_KEY=re_xxxxx
   DEMO_MODE=false
   ```

### Stripe
1. Sign up at stripe.com
2. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   ```
3. Set up webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`

### AI (OpenAI)
1. Get API key from platform.openai.com
2. Add to `.env.local`:
   ```
   AI_API_KEY=sk-xxx
   AI_MODEL=gpt-4o-mini
   ```

---

## Health Check

```
GET http://localhost:3000/api/health
```

Returns database, Redis, and provider status.

---

## Production Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

Set all environment variables in Vercel dashboard.

### Docker

```bash
docker build -t reachflow .
docker run -p 3000:3000 --env-file .env reachflow
```

Or use the full stack:
```bash
docker-compose up -d
```

---

## Database Management

### View data
```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
```

### Reset and re-seed (development only)
```bash
npx prisma migrate reset
npm run db:seed
```

### Backup
```bash
pg_dump reachflow > backup.sql
```
