// prisma/seed.ts
// Realistic demo seed data for ReachFlow

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const firstNames = ['Sarah', 'James', 'Priya', 'Michael', 'Anjali', 'David', 'Emma', 'Ravi', 'Sophia', 'Arjun', 'Olivia', 'Lucas', 'Meera', 'Ethan', 'Nadia']
const lastNames = ['Johnson', 'Patel', 'Kumar', 'Smith', 'Sharma', 'Williams', 'Brown', 'Singh', 'Davis', 'Mehta', 'Wilson', 'Garcia', 'Anderson', 'Taylor', 'Lee']
const companies = ['TechCorp', 'Retail Plus', 'Healthcare Inc', 'Finance Pro', 'EduLearn', 'FoodChain', 'TravelHub', 'AutoWorld', 'GreenEnergy', 'MediaGroup']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomBool(probability = 0.7): boolean {
  return Math.random() < probability
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(daysAgo: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo))
  return d
}

async function main() {
  console.log('🌱 Seeding ReachFlow demo data...')

  // ========================================================
  // Plans
  // ========================================================
  console.log('Creating plans...')

  const freePlan = await prisma.plan.upsert({
    where: { name: 'FREE' },
    update: {},
    create: {
      name: 'FREE',
      displayName: 'Free',
      description: 'Get started with ReachFlow for free.',
      price: 0,
      isActive: true,
      isPublic: true,
      sortOrder: 0,
      features: {
        create: [
          { key: 'messages_per_month', value: '30', label: '30 messages/month' },
          { key: 'contacts_limit', value: '100', label: '100 contacts' },
          { key: 'team_members', value: '1', label: '1 team member' },
          { key: 'campaigns', value: '3', label: '3 campaigns' },
          { key: 'templates', value: '3', label: '3 templates' },
          { key: 'ai_requests', value: '10', label: '10 AI requests/month' },
        ],
      },
    },
    include: { features: true },
  })

  const starterPlan = await prisma.plan.upsert({
    where: { name: 'STARTER' },
    update: {},
    create: {
      name: 'STARTER',
      displayName: 'Starter',
      description: 'For growing businesses ready to scale.',
      price: 1,
      isActive: true,
      isPublic: true,
      sortOrder: 1,
      features: {
        create: [
          { key: 'messages_per_month', value: '1000', label: '1,000 messages/month' },
          { key: 'contacts_limit', value: '500', label: '500 contacts' },
          { key: 'team_members', value: '3', label: '3 team members' },
          { key: 'campaigns', value: '-1', label: 'Unlimited campaigns' },
          { key: 'templates', value: '20', label: '20 templates' },
          { key: 'ai_requests', value: '100', label: '100 AI requests/month' },
          { key: 'csv_import', value: 'true', label: 'CSV import' },
          { key: 'analytics', value: 'advanced', label: 'Advanced analytics' },
        ],
      },
    },
    include: { features: true },
  })

  const proPlan = await prisma.plan.upsert({
    where: { name: 'PRO' },
    update: {},
    create: {
      name: 'PRO',
      displayName: 'Pro',
      description: 'For power users and agencies.',
      price: 29,
      isActive: true,
      isPublic: true,
      sortOrder: 2,
      features: {
        create: [
          { key: 'messages_per_month', value: '10000', label: '10,000 messages/month' },
          { key: 'contacts_limit', value: '5000', label: '5,000 contacts' },
          { key: 'team_members', value: '10', label: '10 team members' },
          { key: 'campaigns', value: '-1', label: 'Unlimited campaigns' },
          { key: 'templates', value: '-1', label: 'Unlimited templates' },
          { key: 'ai_requests', value: '500', label: '500 AI requests/month' },
          { key: 'csv_import', value: 'true', label: 'CSV import' },
          { key: 'analytics', value: 'advanced', label: 'Advanced analytics' },
          { key: 'api_access', value: 'true', label: 'API access' },
          { key: 'audit_logs', value: 'true', label: 'Audit logs' },
        ],
      },
    },
    include: { features: true },
  })

  // ========================================================
  // Demo User
  // ========================================================
  console.log('Creating demo user...')

  const passwordHash = await bcrypt.hash('demo123456', 12)

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@reachflow.app' },
    update: {},
    create: {
      name: 'Sarah Johnson',
      email: 'demo@reachflow.app',
      passwordHash,
      emailVerified: new Date(),
      status: 'ACTIVE',
      timezone: 'Asia/Kolkata',
    },
  })

  // ========================================================
  // Demo Workspace
  // ========================================================
  console.log('Creating demo workspace...')

  const demoWorkspace = await prisma.workspace.upsert({
    where: { slug: 'demo-workspace' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'demo-workspace',
      industry: 'Retail',
      timezone: 'Asia/Kolkata',
      status: 'ACTIVE',
      plan: 'starter',
    },
  })

  // Membership
  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: demoUser.id, workspaceId: demoWorkspace.id } },
    update: {},
    create: {
      userId: demoUser.id,
      workspaceId: demoWorkspace.id,
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    },
  })

  // Subscription
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const existingSubscription = await prisma.subscription.findFirst({
    where: { workspaceId: demoWorkspace.id },
  })

  if (!existingSubscription) {
    await prisma.subscription.create({
      data: {
        workspaceId: demoWorkspace.id,
        planId: starterPlan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    })
  }

  // ========================================================
  // Tags
  // ========================================================
  console.log('Creating tags...')

  const tagNames = ['VIP', 'Customer', 'Lead', 'Newsletter', 'Re-engage', 'Loyal']
  const tags: any[] = []

  for (const tagName of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { workspaceId_name: { workspaceId: demoWorkspace.id, name: tagName } },
      update: {},
      create: {
        workspaceId: demoWorkspace.id,
        name: tagName,
        color: `hsl(${Math.floor(Math.random() * 360)}, 60%, 50%)`,
      },
    })
    tags.push(tag)
  }

  // ========================================================
  // Contact Lists
  // ========================================================
  const lists: any[] = []
  const listNames = ['All Customers', 'VIP Members', 'New Leads', 'Newsletter Subscribers']
  for (const listName of listNames) {
    const existingList = await prisma.contactList.findFirst({
      where: { workspaceId: demoWorkspace.id, name: listName },
    })
    if (!existingList) {
      const list = await prisma.contactList.create({
        data: {
          workspaceId: demoWorkspace.id,
          name: listName,
          isDefault: listName === 'All Customers',
        },
      })
      lists.push(list)
    } else {
      lists.push(existingList)
    }
  }

  // ========================================================
  // Contacts (100 realistic contacts)
  // ========================================================
  console.log('Creating 100 demo contacts...')

  const existingContactCount = await prisma.contact.count({ where: { workspaceId: demoWorkspace.id } })

  if (existingContactCount < 10) {
    for (let i = 0; i < 100; i++) {
      const firstName = randomItem(firstNames)
      const lastName = randomItem(lastNames)
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${randomItem(companies).toLowerCase().replace(' ', '')}.com`
      const phone = `+91${randomInt(6000000000, 9999999999)}`

      try {
        const contact = await prisma.contact.create({
          data: {
            workspaceId: demoWorkspace.id,
            firstName,
            lastName,
            email,
            phone,
            countryCode: '+91',
            whatsappOptIn: randomBool(0.75),
            emailOptIn: randomBool(0.85),
            optInSource: 'Website',
            optInTimestamp: randomDate(180),
            status: randomBool(0.95) ? 'ACTIVE' : 'UNSUBSCRIBED',
            customFields: {
              company: randomItem(companies),
              industry: randomItem(['Tech', 'Retail', 'Healthcare', 'Education', 'Finance']),
            },
          },
        })

        // Add to random list
        const list = randomItem(lists)
        await prisma.contactListMember.create({
          data: { contactId: contact.id, contactListId: list.id },
        }).catch(() => {}) // ignore duplicate

        // Add random tag
        if (randomBool(0.5)) {
          const tag = randomItem(tags)
          await prisma.contactTag.create({
            data: { contactId: contact.id, tagId: tag.id },
          }).catch(() => {})
        }
      } catch {
        // Skip duplicates
      }
    }
  }

  // ========================================================
  // Templates
  // ========================================================
  console.log('Creating demo templates...')

  const templates = [
    {
      name: 'Welcome Message',
      channel: 'WHATSAPP' as const,
      category: 'Onboarding',
      content: {
        text: 'Welcome to {{company_name}}, {{first_name}}! 🎉\n\nWe\'re thrilled to have you on board. Here\'s what you can do:\n\n• Browse our latest products\n• Get exclusive member discounts\n• Access 24/7 support\n\nReply STOP to opt out.',
      },
      variables: ['{{first_name}}', '{{company_name}}'],
    },
    {
      name: 'Order Confirmation',
      channel: 'WHATSAPP' as const,
      category: 'Transactional',
      content: {
        text: 'Hi {{first_name}}! ✅ Your order #{{order_id}} has been confirmed.\n\nEstimated delivery: 3-5 business days.\n\nTrack your order at our website. Questions? Just reply here!',
      },
      variables: ['{{first_name}}', '{{order_id}}'],
    },
    {
      name: 'Monthly Newsletter',
      channel: 'EMAIL' as const,
      category: 'Newsletter',
      content: {
        subject: '{{month}} Newsletter — What\'s New at {{company_name}}',
        text: 'Dear {{first_name}},\n\nHere\'s your monthly update packed with exciting news and exclusive offers.\n\nThis month\'s highlights:\n• New product launches\n• Special promotions\n• Customer spotlights\n\nRead the full newsletter on our website.\n\nBest regards,\nThe Team\n\nUnsubscribe from this newsletter.',
      },
      variables: ['{{first_name}}', '{{month}}', '{{company_name}}'],
    },
    {
      name: 'Flash Sale Alert',
      channel: 'WHATSAPP' as const,
      category: 'Promotional',
      content: {
        text: '🔥 FLASH SALE! Hi {{first_name}},\n\n24 hours only: 40% off everything!\n\nUse code: FLASH40\n\nShop now before it ends! Link in bio.\n\nReply STOP to opt out.',
      },
      variables: ['{{first_name}}'],
    },
    {
      name: 'Appointment Reminder',
      channel: 'EMAIL' as const,
      category: 'Transactional',
      content: {
        subject: 'Reminder: Your appointment is tomorrow',
        text: 'Hi {{first_name}},\n\nThis is a friendly reminder that you have an appointment scheduled for tomorrow at {{appointment_time}}.\n\nLocation: {{location}}\n\nNeed to reschedule? Click here or reply to this email.\n\nWe look forward to seeing you!\n\nBest,\nThe Team',
      },
      variables: ['{{first_name}}', '{{appointment_time}}', '{{location}}'],
    },
  ]

  for (const tmpl of templates) {
    const existingTemplate = await prisma.template.findFirst({
      where: { workspaceId: demoWorkspace.id, name: tmpl.name },
    })
    if (!existingTemplate) {
      await prisma.template.create({
        data: {
          workspaceId: demoWorkspace.id,
          name: tmpl.name,
          channel: tmpl.channel,
          category: tmpl.category,
          content: tmpl.content,
          variables: tmpl.variables,
          status: 'ACTIVE',
        },
      })
    }
  }

  // ========================================================
  // Campaigns (10 historical campaigns)
  // ========================================================
  console.log('Creating demo campaigns...')

  const campaignData = [
    { name: 'Summer Sale Announcement', channel: 'WHATSAPP' as const, status: 'COMPLETED' as const, sent: 450, delivered: 441, failed: 9, read: 380 },
    { name: 'Monthly Newsletter — August', channel: 'EMAIL' as const, status: 'COMPLETED' as const, sent: 320, delivered: 308, failed: 12, read: 0 },
    { name: 'New Product Launch', channel: 'WHATSAPP' as const, status: 'COMPLETED' as const, sent: 280, delivered: 275, failed: 5, read: 240 },
    { name: 'Customer Feedback Request', channel: 'EMAIL' as const, status: 'COMPLETED' as const, sent: 200, delivered: 193, failed: 7, read: 0 },
    { name: 'VIP Member Exclusive Offer', channel: 'WHATSAPP' as const, status: 'COMPLETED' as const, sent: 85, delivered: 84, failed: 1, read: 79 },
    { name: 'Re-engagement Campaign', channel: 'EMAIL' as const, status: 'COMPLETED' as const, sent: 180, delivered: 165, failed: 15, read: 0 },
    { name: 'Flash Sale Alert', channel: 'WHATSAPP' as const, status: 'COMPLETED' as const, sent: 520, delivered: 511, failed: 9, read: 450 },
    { name: 'Holiday Greeting', channel: 'EMAIL' as const, status: 'COMPLETED' as const, sent: 400, delivered: 392, failed: 8, read: 0 },
    { name: 'September Newsletter', channel: 'EMAIL' as const, status: 'SCHEDULED' as const, sent: 0, delivered: 0, failed: 0, read: 0 },
    { name: 'Product Update Announcement', channel: 'WHATSAPP' as const, status: 'DRAFT' as const, sent: 0, delivered: 0, failed: 0, read: 0 },
  ]

  for (const c of campaignData) {
    const existingCampaign = await prisma.campaign.findFirst({
      where: { workspaceId: demoWorkspace.id, name: c.name },
    })

    if (!existingCampaign) {
      const createdAt = randomDate(60)
      const sentAt = c.status === 'COMPLETED' ? new Date(createdAt.getTime() + 60000) : null

      await prisma.campaign.create({
        data: {
          workspaceId: demoWorkspace.id,
          name: c.name,
          channel: c.channel,
          status: c.status,
          audienceType: 'ALL',
          audienceConfig: { type: 'ALL' },
          messageConfig: {
            text: `Demo ${c.channel === 'WHATSAPP' ? 'WhatsApp' : 'email'} message for ${c.name}`,
            subject: c.channel === 'EMAIL' ? c.name : undefined,
          },
          scheduleType: c.status === 'SCHEDULED' ? 'SCHEDULED' : 'IMMEDIATE',
          scheduledAt: c.status === 'SCHEDULED' ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) : null,
          totalRecipients: c.sent,
          sentCount: c.sent,
          deliveredCount: c.delivered,
          failedCount: c.failed,
          readCount: c.read,
          sentAt,
          completedAt: c.status === 'COMPLETED' ? new Date(createdAt.getTime() + 120000) : null,
          createdAt,
        },
      })
    }
  }

  // ========================================================
  // Usage
  // ========================================================
  console.log('Creating usage data...')

  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  await prisma.usage.upsert({
    where: {
      workspaceId_metric_channel_period: {
        workspaceId: demoWorkspace.id,
        metric: 'messages_sent',
        channel: 'all',
        period: currentPeriod,
      },
    },
    update: {},
    create: {
      workspaceId: demoWorkspace.id,
      metric: 'messages_sent',
      channel: 'all',
      count: 420,
      period: currentPeriod,
      resetAt: periodEnd,
    },
  })

  // ========================================================
  // Analytics snapshots
  // ========================================================
  console.log('Creating analytics data...')

  for (let i = 30; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const sent = randomInt(50, 250)
    const delivered = Math.max(0, sent - randomInt(0, 10))

    await prisma.analyticsSnapshot.upsert({
      where: {
        workspaceId_date_channel_metric: {
          workspaceId: demoWorkspace.id,
          date: new Date(dateStr),
          channel: 'WHATSAPP',
          metric: 'sent',
        },
      },
      update: {},
      create: {
        workspaceId: demoWorkspace.id,
        date: new Date(dateStr),
        channel: 'WHATSAPP',
        metric: 'sent',
        value: sent,
      },
    })

    await prisma.analyticsSnapshot.upsert({
      where: {
        workspaceId_date_channel_metric: {
          workspaceId: demoWorkspace.id,
          date: new Date(dateStr),
          channel: 'WHATSAPP',
          metric: 'delivered',
        },
      },
      update: {},
      create: {
        workspaceId: demoWorkspace.id,
        date: new Date(dateStr),
        channel: 'WHATSAPP',
        metric: 'delivered',
        value: delivered,
      },
    })
  }

  // ========================================================
  // Notifications
  // ========================================================
  await prisma.notification.createMany({
    data: [
      {
        userId: demoUser.id,
        workspaceId: demoWorkspace.id,
        type: 'CAMPAIGN_COMPLETED',
        title: 'Campaign completed',
        message: 'Summer Sale Announcement was sent to 450 contacts with 98% delivery rate.',
        read: false,
      },
      {
        userId: demoUser.id,
        workspaceId: demoWorkspace.id,
        type: 'USAGE_LIMIT_APPROACHING',
        title: 'Approaching message limit',
        message: 'You\'ve used 420 of 1,000 messages this month (42%).',
        read: true,
        readAt: new Date(),
      },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seed completed!')
  console.log('')
  console.log('Demo credentials:')
  console.log('  Email:    demo@reachflow.app')
  console.log('  Password: demo123456')
  console.log('')
  console.log('Local URL: http://localhost:3000')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
