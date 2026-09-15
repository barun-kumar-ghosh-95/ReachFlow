// src/app/(app)/campaigns/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, MessageSquare, Mail, Clock, BarChart2 } from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Campaigns' }

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { status?: string; channel?: string }
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const statusFilter = searchParams.status
  const channelFilter = searchParams.channel

  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceId: membership.workspaceId,
      ...(statusFilter && statusFilter !== 'all' ? { status: statusFilter.toUpperCase() as any } : {}),
      ...(channelFilter && channelFilter !== 'all' ? { channel: channelFilter.toUpperCase() as any } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'sending', label: 'Sending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ]

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <h1 className="page-title">Campaigns</h1>
          <span className="badge badge-gray">{campaigns.length}</span>
        </div>
        <div className="main-header-right">
          <Link href="/campaigns/new" className="btn btn-primary btn-sm" id="campaigns-create">
            <Plus size={14} /> Create campaign
          </Link>
        </div>
      </div>

      <div className="page-content">
        {/* Filter tabs */}
        <div className="tabs" style={{ marginBottom: 'var(--space-5)' }}>
          {statusFilters.map((f) => (
            <Link
              key={f.value}
              href={`/campaigns?status=${f.value}${channelFilter ? `&channel=${channelFilter}` : ''}`}
              className={`tab${(!statusFilter || statusFilter === f.value || (!statusFilter && f.value === 'all')) ? ' active' : ''}`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <MessageSquare size={28} />
            </div>
            <div className="empty-state-title">No campaigns yet</div>
            <div className="empty-state-description">
              Create your first campaign to start reaching your audience via WhatsApp or Email.
            </div>
            <Link href="/campaigns/new" className="btn btn-primary">
              <Plus size={16} /> Create your first campaign
            </Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Recipients</th>
                  <th>Performance</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const deliveryRate = campaign.sentCount > 0
                    ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
                    : null

                  return (
                    <tr key={campaign.id}>
                      <td>
                        <Link href={`/campaigns/${campaign.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontWeight: '600', color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>
                            {campaign.name}
                          </div>
                        </Link>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          {campaign.channel === 'WHATSAPP' ? (
                            <span className="badge badge-whatsapp"><MessageSquare size={12} /> WhatsApp</span>
                          ) : (
                            <span className="badge badge-brand"><Mail size={12} /> Email</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge status-${campaign.status.toLowerCase()}`}>
                          {campaign.status === 'PROCESSING' ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="status-dot processing" />
                              Processing
                            </span>
                          ) : campaign.status.charAt(0) + campaign.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        {campaign.totalRecipients.toLocaleString()}
                      </td>
                      <td>
                        {deliveryRate !== null ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <div style={{ flex: 1, height: '4px', background: 'var(--bg-secondary)', borderRadius: '999px', width: '80px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${deliveryRate}%`, background: 'var(--success-500)', borderRadius: '999px' }} />
                              </div>
                              <span style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--success-600)' }}>{deliveryRate}%</span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {campaign.scheduledAt ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {formatDate(campaign.scheduledAt)}
                          </div>
                        ) : formatRelativeTime(campaign.createdAt)}
                      </td>
                      <td>
                        <Link href={`/campaigns/${campaign.id}/analytics`} className="btn btn-ghost btn-icon-sm" title="View analytics">
                          <BarChart2 size={16} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
