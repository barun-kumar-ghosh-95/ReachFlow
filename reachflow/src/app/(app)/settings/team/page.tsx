// src/app/(app)/settings/team/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Users, Crown, Shield, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Team Settings' }

export default async function TeamSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const members = await prisma.membership.findMany({
    where: { workspaceId: membership.workspaceId, status: 'ACTIVE' },
    include: { user: { select: { id: true, name: true, email: true, image: true, lastLoginAt: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const roleIcons: Record<string, any> = { OWNER: Crown, ADMIN: Shield, MEMBER: User }
  const roleColors: Record<string, string> = { OWNER: 'var(--warning-600)', ADMIN: 'var(--brand-600)', MEMBER: 'var(--text-secondary)' }

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <h1 className="page-title">Team</h1>
          <span className="badge badge-gray">{members.length}</span>
        </div>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: '640px' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="card-title">Team Members</div>
                <div className="card-description">Manage your workspace team</div>
              </div>
            </div>

            {members.map((m) => {
              const RoleIcon = roleIcons[m.role] || User
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div className="avatar avatar-sm" style={{ background: `hsl(${(m.user.id.charCodeAt(0) * 30) % 360}deg, 60%, 55%)`, flexShrink: 0 }}>
                    {(m.user.name?.[0] || m.user.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {m.user.name || 'Unknown'}
                      {m.userId === session.user.id && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginLeft: '8px' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{m.user.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: roleColors[m.role] }}>
                    <RoleIcon size={14} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: '600' }}>{m.role.charAt(0) + m.role.slice(1).toLowerCase()}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: '80px', textAlign: 'right' }}>
                    {m.user.lastLoginAt ? `Last seen ${formatDate(m.user.lastLoginAt)}` : 'Never logged in'}
                  </div>
                </div>
              )
            })}

            <div style={{ padding: 'var(--space-4) var(--space-5)', background: 'var(--bg-secondary)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
                To invite new team members, upgrade your plan. Free plan allows 1 member.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
