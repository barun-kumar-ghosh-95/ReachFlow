// src/app/(app)/settings/workspace/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { WorkspaceSettingsForm } from './WorkspaceSettingsForm'

export const metadata: Metadata = { title: 'Workspace Settings' }

export default async function WorkspaceSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/settings')

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Workspace Settings</h1>
      </div>
      <div className="page-content">
        <div style={{ maxWidth: '520px' }}>
          <WorkspaceSettingsForm workspace={membership.workspace} />
        </div>
      </div>
    </>
  )
}
