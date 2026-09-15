// src/app/api/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  channel: z.enum(['WHATSAPP', 'EMAIL']),
  category: z.string().max(100).optional().nullable(),
  content: z.object({
    text: z.string().optional(),
    subject: z.string().optional(),
    mediaUrl: z.string().optional(),
  }),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) return NextResponse.json({ templates: [] })

  const templates = await prisma.template.findMany({
    where: { workspaceId: membership.workspaceId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ templates })
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
    const parsed = createTemplateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid template data.', details: parsed.error.issues }, { status: 400 })

    const { name, channel, category, content } = parsed.data

    // Extract variables from content text
    const text = content.text || ''
    const variables = Array.from(new Set(text.match(/\{\{[a-z_]+\}\}/g) || []))

    const template = await prisma.template.create({
      data: {
        workspaceId: membership.workspaceId,
        name,
        channel,
        category: category || null,
        content,
        variables,
        status: 'ACTIVE',
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        workspaceId: membership.workspaceId,
        action: 'template.created',
        resource: 'template',
        resourceId: template.id,
        metadata: { name, channel },
      },
    })

    return NextResponse.json({ id: template.id, success: true })
  } catch (error) {
    console.error('[Templates POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create template.' }, { status: 500 })
  }
}
