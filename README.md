# ⚡ ReachFlow

> **"One place to reach your audience."**  
> Create, personalize, schedule, and analyze WhatsApp & Email campaigns from a single multi-tenant workspace.

---

## 🌐 Localhost Live Demo

ReachFlow dev server runs locally at:

### 🔗 **[http://localhost:3000](http://localhost:3000)**

### 🔑 Demo Credentials
- **Email:** `demo@reachflow.app`
- **Password:** `ReachFlow2024!`

---

## ✨ Core Features

- 📱 **WhatsApp Business Cloud API** — Send templated broadcast messages with variable substitution and status webhooks.
- 📧 **High-Deliverability Email** — Integrated SMTP / Resend provider for automated email sequences.
- 🤖 **AI Copy Generator** — Built-in AI assistant to draft high-converting headlines, body text, and calls to action.
- 👥 **Audience & Contact Management** — Dynamic tag-based segmentation, opt-in/opt-out status tracking, and CSV bulk importer.
- ⚡ **Background Queue Engine** — Distributed job processing with **BullMQ** and **Redis** for scheduled & rate-limited message dispatching.
- 🏢 **Multi-Tenant Architecture** — Isolated workspaces, team member invitations, and Role-Based Access Control (Owner, Admin, Member).
- 💳 **SaaS Billing & Subscriptions** — Tiered plans (Starter, Growth, Scale) with automated usage enforcement and Stripe integration.
- 🛡️ **Enterprise Security** — NextAuth.js session tokens, bcrypt password hashing, CSRF protection, and audit logging.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router, Server Actions, API Routes) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/) |
| **Queue & Cache** | [BullMQ](https://bullmq.io/) + [Redis](https://redis.io/) |
| **Authentication** | [NextAuth.js v5](https://authjs.dev/) |
| **Payments** | [Stripe](https://stripe.com/) |
| **Styling** | Custom Design System with Vanilla CSS Variables & Micro-animations |
| **Icons** | [Lucide React](https://lucide.dev/) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js 20+** installed
- **PostgreSQL** & **Redis** (optional for mock/demo mode)

### 2. Clone & Install
```bash
# Clone the repository
git clone https://github.com/barun-kumar-ghosh-95/Reachflow.git
cd Reachflow

# Install dependencies
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env.local
```

Configure your `.env.local` settings:
```env
APP_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/reachflow"
REDIS_URL="redis://localhost:6379"
AUTH_SECRET="reachflow-dev-secret-key-change-in-production-32chars"
DEMO_MODE=true
```

### 4. Database Setup & Seeding
```bash
# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# Seed realistic demo data (100+ contacts, 10 campaigns, analytics)
npx tsx prisma/seed.ts
```

### 5. Launch the Local Dev Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 🐳 Running with Docker

You can spin up the complete stack (Next.js app, PostgreSQL, Redis, and MinIO storage) with a single command:

```bash
docker-compose up -d
```

Services exposed:
- **Web Application:** `http://localhost:3000`
- **PostgreSQL Database:** `localhost:5432`
- **Redis Queue:** `localhost:6379`
- **MinIO S3 Console:** `http://localhost:9001`

---

## 📁 Project Architecture

```
reachflow/
├── prisma/
│   ├── schema.prisma       # Database models (User, Workspace, Campaign, Contact, etc.)
│   └── seed.ts             # Realistic demo data seeder
├── public/                 # Static assets & icons
├── src/
│   ├── app/
│   │   ├── (app)/          # Protected app routes (Dashboard, Campaigns, Contacts, etc.)
│   │   ├── (auth)/         # Authentication routes (Login, Register)
│   │   ├── api/            # API endpoints (Health, Webhooks, AI, Auth, Export)
│   │   └── page.tsx        # High-conversion landing page
│   ├── components/
│   │   ├── app/            # App dashboard shell, navbar & sidebar
│   │   ├── landing/        # Landing page sections (Hero, Features, Pricing, Testimonials)
│   │   └── ui/             # Reusable UI components (Modals, Inputs, Buttons)
│   ├── config/             # App & plan pricing configurations
│   ├── lib/                # Prisma client, Auth options, Redis singleton, Helpers
│   └── workers/            # BullMQ background campaign dispatch workers
├── ARCHITECTURE.md         # Full system architecture documentation
├── DEPLOYMENT.md           # Production deployment instructions
├── docker-compose.yml      # Local dev multi-container composition
└── package.json            # Scripts & project dependencies
```

---

## 📄 License 
MIT License

- Built with modern SaaS architecture best practices.
- Uses the official Meta WhatsApp Business Cloud API. Not affiliated with Meta Platforms, Inc.
