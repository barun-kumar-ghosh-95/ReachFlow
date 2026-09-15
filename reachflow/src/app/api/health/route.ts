// src/app/api/health/route.ts
// Health, readiness, liveness endpoints

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const start = Date.now()
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {}

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok', latencyMs: Date.now() - start }
  } catch (e: any) {
    checks.database = { status: 'error', error: e.message }
  }

  // Redis check (optional)
  try {
    const { default: redis } = await import('@/lib/redis')
    const redisStart = Date.now()
    await redis.ping()
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart }
  } catch {
    checks.redis = { status: 'unavailable' }
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok' || c.status === 'unavailable')

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      demoMode: process.env.DEMO_MODE === 'true',
      checks,
    },
    { status: allOk ? 200 : 503 }
  )
}
