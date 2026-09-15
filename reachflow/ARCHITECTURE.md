# ReachFlow — Architecture Documentation

## Overview

ReachFlow is a multi-tenant SaaS platform for WhatsApp and email campaign management, built as a modular monolith with a separate worker process.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Vanilla CSS |
| Backend | Next.js API Routes, Server Components |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Auth | NextAuth.js v5 |
| Payments | Stripe (Razorpay-ready abstraction) |
| WhatsApp | Meta WhatsApp Business Cloud API |
| Email | Resend (abstracted provider) |
| Storage | S3-compatible (MinIO for local) |
| AI | OpenAI (abstracted provider) |

## Architecture Diagram

```
                      CDN / Edge
                          |
                  Next.js Frontend
                          |
                  Next.js API Routes
                          |
                  Service Layer
                          |
           +--------------+--------------+
           |              |              |
      PostgreSQL         Redis      Object Storage
      (Prisma)           |
                    BullMQ Queues
                          |
                       Workers
                          |
          +--------------+--------------+
          |                            |
  WhatsApp Cloud API           Email Provider
  (Meta Business)              (Resend/SES/SMTP)
```

## Multi-Tenancy

Every resource belongs to a `Workspace`. Tenant isolation is enforced at the service layer:

- All database queries include `workspaceId`
- Middleware verifies workspace membership before any resource access
- Frontend filtering is NOT relied upon for security

## Queue Architecture

Queues use BullMQ (Redis-backed):

| Queue | Purpose |
|-------|---------|
| campaign-processing | Build recipient list, validate contacts |
| whatsapp-sending | Send individual WhatsApp messages |
| email-sending | Send individual emails |
| scheduled-campaigns | Check for campaigns due to send |
| webhook-processing | Process provider webhook events |
| analytics-processing | Aggregate analytics data |
| notifications | Send user notifications |

Each job is:
- **Idempotent** — safe to retry without duplicate effects
- **Retryable** — exponential backoff up to 3 attempts
- **Observable** — logged in JobLog table
- **Recoverable** — dead letter handling

## Authentication

NextAuth.js v5 with:
- Credentials provider (email + hashed password)
- JWT sessions
- Prisma adapter for session storage
- Route protection via middleware

## Usage & Quota

The `UsageService` is the single source of truth for quota:

```
UsageService.checkQuota() → throws if insufficient
UsageService.consume() → transactional increment
UsageService.refund() → transactional decrement
UsageService.getRemaining() → reads from Usage table
```

Never scatter `if messages > 30` throughout the code. Use the service.

## Payment Flow

```
User clicks "Upgrade"
  → /api/billing/checkout (creates Stripe session)
  → Stripe hosted checkout
  → Stripe webhook → /api/webhooks/stripe
  → Subscription updated in database
  → User notified
```

Payment status is NEVER trusted from the frontend.

## Demo Mode

When `DEMO_MODE=true`:
- Provider adapters return simulated responses
- No real messages are sent
- Campaign status transitions happen automatically
- Seed data provides realistic demo experience

## Security

- Passwords hashed with bcrypt (cost 12)
- Sessions use signed JWT
- API requires valid session on all protected routes
- Webhook signatures verified cryptographically
- File uploads: MIME + size validation before storage
- Rate limiting per user/workspace/action
- Audit logs for all sensitive actions

## Scaling Path

Current: Modular monolith + worker process

Future:
1. Separate worker to dedicated service
2. Queue depth monitoring
3. Horizontal scaling of workers
4. Database read replicas
5. Redis cluster
6. CDN for static assets
