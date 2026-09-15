// src/app/(app)/settings/compliance/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Shield, Info } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance' }

export default async function CompliancePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const suppressions = await prisma.suppression.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const unsubscribedCount = await prisma.contact.count({
    where: { workspaceId: membership.workspaceId, status: 'UNSUBSCRIBED' },
  })

  const bouncedCount = await prisma.contact.count({
    where: { workspaceId: membership.workspaceId, status: 'BOUNCED' },
  })

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Compliance</h1>
      </div>
      <div className="page-content">
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', background: 'var(--info-50)', border: '1px solid var(--info-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <Info size={16} color="var(--info-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--info-600)', lineHeight: '1.6' }}>
              Contacts who unsubscribe are automatically excluded from all future campaigns. You can view and manage opt-outs here.
            </span>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div className="stat-card">
              <div className="stat-label">Unsubscribed Contacts</div>
              <div className="stat-value" style={{ color: 'var(--warning-600)' }}>{unsubscribedCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Bounced Contacts</div>
              <div className="stat-value" style={{ color: 'var(--error-500)' }}>{bouncedCount}</div>
            </div>
          </div>

          {/* Suppression list */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border)' }}>
              <div className="card-title">Suppression List</div>
            </div>
            {suppressions.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
                <div className="empty-state-icon"><Shield size={24} /></div>
                <div className="empty-state-title">No suppressions</div>
                <div className="empty-state-description">No emails or phone numbers are currently suppressed.</div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Contact</th>
                      <th>Reason</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppressions.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>{s.emailOrPhone}</td>
                        <td><span className="badge badge-gray">{s.reason}</span></td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{formatDate(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
