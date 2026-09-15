// src/app/api/contacts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateContactSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  whatsappOptIn: z.boolean().optional(),
  emailOptIn: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED', 'ARCHIVED']).optional(),
  customFields: z.record(z.string()).optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) return NextResponse.json({ error: 'No workspace.' }, { status: 403 })

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: membership.workspaceId },
    include: { tags: { include: { tag: true } } },
  })

  if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })

  return NextResponse.json({ contact })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) return NextResponse.json({ error: 'No workspace.' }, { status: 403 })

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: membership.workspaceId },
  })
  if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })

  const body = await request.json()
  const parsed = updateContactSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data.' }, { status: 400 })

  const updated = await prisma.contact.update({
    where: { id: params.id },
    data: parsed.data,
  })

  return NextResponse.json({ contact: updated })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) return NextResponse.json({ error: 'No workspace.' }, { status: 403 })

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: membership.workspaceId },
  })
  if (!contact) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 })

  // Soft delete
  await prisma.contact.update({
    where: { id: params.id },
    data: { status: 'ARCHIVED' },
  })

  return NextResponse.json({ success: true })
}
