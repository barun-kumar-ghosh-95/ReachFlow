// src/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  workspace: z.string().min(2).max(100),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input. Please check your details.' },
        { status: 400 }
      )
    }

    const { name, email, password, workspace } = parsed.data

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create unique workspace slug
    let slug = slugify(workspace)
    let slugExists = await prisma.workspace.findUnique({ where: { slug } })
    let attempt = 0
    while (slugExists) {
      attempt++
      slug = `${slugify(workspace)}-${attempt}`
      slugExists = await prisma.workspace.findUnique({ where: { slug } })
    }

    // Create user + workspace + membership + free subscription in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create user
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          emailVerified: null, // will be verified later
        },
      })

      // 2. Create workspace
      const newWorkspace = await tx.workspace.create({
        data: {
          name: workspace,
          slug,
          plan: 'free',
        },
      })

      // 3. Create membership (owner)
      await tx.membership.create({
        data: {
          userId: user.id,
          workspaceId: newWorkspace.id,
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      })

      // 4. Find or create free plan
      let freePlan = await tx.plan.findUnique({ where: { name: 'FREE' } })
      if (!freePlan) {
        freePlan = await tx.plan.create({
          data: {
            name: 'FREE',
            displayName: 'Free',
            description: 'Get started with ReachFlow for free.',
            price: 0,
            features: {
              create: [
                { key: 'messages_per_month', value: '30', label: '30 messages/month' },
                { key: 'contacts_limit', value: '100', label: '100 contacts' },
                { key: 'team_members', value: '1', label: '1 team member' },
                { key: 'campaigns', value: '3', label: '3 campaigns' },
                { key: 'templates', value: '3', label: '3 templates' },
                { key: 'ai_requests', value: '10', label: '10 AI requests' },
              ],
            },
          },
        })
      }

      // 5. Create subscription
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await tx.subscription.create({
        data: {
          workspaceId: newWorkspace.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      })

      // 6. Initialize usage
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      await tx.usage.create({
        data: {
          workspaceId: newWorkspace.id,
          metric: 'messages_sent',
          channel: 'all',
          count: 0,
          period,
          resetAt: periodEnd,
        },
      })

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          workspaceId: newWorkspace.id,
          action: 'user.registered',
          resource: 'user',
          resourceId: user.id,
          metadata: { workspaceName: workspace },
        },
      })

      return { user, workspace: newWorkspace }
    })

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      workspaceId: result.workspace.id,
    })
  } catch (error) {
    console.error('[Register] Error:', error)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
