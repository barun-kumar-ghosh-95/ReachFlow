// src/app/api/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  audienceType: z.enum(['ALL', 'LIST', 'TAGS', 'SELECTED']).default('ALL'),
  listIds: z.array(z.string()).default([]),
  messageConfig: z.object({
    text: z.string().optional(),
    subject: z.string().optional(),
    mediaUrl: z.string().optional(),
    templateId: z.string().optional(),
  }),
  scheduleType: z.enum(['IMMEDIATE', 'SCHEDULED']).default('IMMEDIATE'),
  scheduledAt: z.string().optional().nullable(),
  timezone: z.string().default('UTC'),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = createCampaignSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid campaign data.', details: parsed.error.issues }, { status: 400 })
    }

    const { name, channel, audienceType, listIds, messageConfig, scheduleType, scheduledAt, timezone } = parsed.data

    // Get workspace
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found.' }, { status: 403 })
    }

    const workspaceId = membership.workspaceId

    // Check workspace is active
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace || workspace.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Workspace is not active.' }, { status: 403 })
    }

    // Check subscription and quota
    const now = new Date()
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const subscription = await prisma.subscription.findFirst({
      where: { workspaceId, status: 'ACTIVE' },
      include: { plan: { include: { features: true } } },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription.' }, { status: 403 })
    }

    const messagesLimit = parseInt(
      subscription.plan.features.find((f) => f.key === 'messages_per_month')?.value || '30'
    )

    const usage = await prisma.usage.findFirst({
      where: { workspaceId, metric: 'messages_sent', channel: 'all', period },
    })

    const currentUsage = usage?.count || 0
    const remaining = Math.max(0, messagesLimit - currentUsage)

    if (remaining === 0) {
      return NextResponse.json({
        error: `You've used all ${messagesLimit} messages this month. Upgrade your plan to send more.`,
        code: 'QUOTA_EXCEEDED',
      }, { status: 402 })
    }

    // Build audience config
    const audienceConfig = {
      type: audienceType,
      listIds: audienceType === 'LIST' ? listIds : [],
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        workspaceId,
        name,
        channel,
        audienceType,
        audienceConfig,
        messageConfig,
        scheduleType,
        scheduledAt: scheduleType === 'SCHEDULED' && scheduledAt ? new Date(scheduledAt) : null,
        timezone,
        status: scheduleType === 'SCHEDULED' ? 'SCHEDULED' : 'DRAFT',
        idempotencyKey: uuidv4(),
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId,
        action: 'campaign.created',
        resource: 'campaign',
        resourceId: campaign.id,
        metadata: { name, channel, scheduleType },
      },
    })

    // If immediate, queue the campaign
    if (scheduleType === 'IMMEDIATE') {
      // In demo mode or when Redis not available, just update status
      const isDemoMode = process.env.DEMO_MODE === 'true'

      if (isDemoMode) {
        // Simulate processing in demo mode
        await simulateDemoSend(campaign.id, workspaceId)
      } else {
        // TODO: Add to BullMQ queue
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'PROCESSING' },
        })
      }
    }

    return NextResponse.json({ id: campaign.id, status: campaign.status })
  } catch (error) {
    console.error('[Campaigns POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create campaign.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })

  if (!membership) {
    return NextResponse.json({ campaigns: [] })
  }

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ campaigns })
}

// Demo simulation — runs immediately without real queue
async function simulateDemoSend(campaignId: string, workspaceId: string) {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // Count eligible contacts
  const contactCount = await prisma.contact.count({
    where: { workspaceId, status: 'ACTIVE' },
  })

  const recipientCount = Math.min(contactCount, 10) // Demo: max 10 simulated messages

  // Update campaign to processing
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'SENDING',
      totalRecipients: recipientCount,
    },
  })

  // Simulate async completion (non-blocking)
  setTimeout(async () => {
    const delivered = Math.max(0, recipientCount - Math.floor(recipientCount * 0.02))
    const failed = recipientCount - delivered

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        sentCount: recipientCount,
        deliveredCount: delivered,
        failedCount: failed,
        sentAt: new Date(),
        completedAt: new Date(),
      },
    })

    // Update usage
    const now = new Date()
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await prisma.usage.upsert({
      where: {
        workspaceId_metric_channel_period: {
          workspaceId,
          metric: 'messages_sent',
          channel: 'all',
          period,
        },
      },
      create: {
        workspaceId,
        metric: 'messages_sent',
        channel: 'all',
        count: recipientCount,
        period,
        resetAt: periodEnd,
      },
      update: {
        count: { increment: recipientCount },
      },
    })
  }, 3000)
}
