// src/app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createContactSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(30).optional(),
  whatsappOptIn: z.boolean().default(false),
  emailOptIn: z.boolean().default(false),
  customFields: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) return NextResponse.json({ contacts: [], total: 0 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const where = {
    workspaceId: membership.workspaceId,
    status: { not: 'ARCHIVED' as const },
    ...(search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
    prisma.contact.count({ where }),
  ])

  return NextResponse.json({ contacts, total, page, pages: Math.ceil(total / pageSize) })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) return NextResponse.json({ error: 'No workspace found.' }, { status: 403 })

  try {
    const body = await request.json()
    const parsed = createContactSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid contact data.', details: parsed.error.issues }, { status: 400 })
    }

    const { firstName, lastName, email, phone, whatsappOptIn, emailOptIn, customFields, tags } = parsed.data

    if (!email && !phone) {
      return NextResponse.json({ error: 'Contact must have at least an email or phone number.' }, { status: 400 })
    }

    // Check for duplicate email within workspace
    if (email) {
      const existing = await prisma.contact.findFirst({
        where: { workspaceId: membership.workspaceId, email },
      })
      if (existing) {
        return NextResponse.json({ error: 'A contact with this email already exists.' }, { status: 409 })
      }
    }

    const contact = await prisma.contact.create({
      data: {
        workspaceId: membership.workspaceId,
        firstName,
        lastName,
        email,
        phone,
        whatsappOptIn,
        emailOptIn,
        customFields: customFields || {},
        status: 'ACTIVE',
      },
    })

    // Handle tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { workspaceId_name: { workspaceId: membership.workspaceId, name: tagName } },
          create: { workspaceId: membership.workspaceId, name: tagName, color: '#5a6af0' },
          update: {},
        })
        await prisma.contactTag.create({
          data: { contactId: contact.id, tagId: tag.id },
        }).catch(() => {}) // ignore duplicate
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId: membership.workspaceId,
        action: 'contact.created',
        resource: 'contact',
        resourceId: contact.id,
        metadata: { email, phone },
      },
    })

    return NextResponse.json({ id: contact.id, success: true })
  } catch (error) {
    console.error('[Contacts POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create contact.' }, { status: 500 })
  }
}
