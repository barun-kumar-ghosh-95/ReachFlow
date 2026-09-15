// src/app/(app)/campaigns/[id]/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, MessageSquare, Mail, BarChart2,
  Users, CheckCircle, XCircle, Clock, Send
} from 'lucide-react'
import { formatDate, formatDateTime, formatNumber } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Campaign Detail' }

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const campaign = await prisma.campaign.findFirst({
    where: { id: params.id, workspaceId: membership.workspaceId },
  })

  if (!campaign) notFound()

  const messageConfig = campaign.messageConfig as any

  const deliveryRate = campaign.sentCount > 0
    ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
    : 0
  const readRate = campaign.deliveredCount > 0
    ? Math.round((campaign.readCount / campaign.deliveredCount) * 100)
    : 0

  const statusColors: Record<string, string> = {
    DRAFT: 'gray', SCHEDULED: 'warning', PROCESSING: 'brand',
    SENDING: 'brand', COMPLETED: 'success', FAILED: 'error', CANCELLED: 'gray',
  }

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <Link href="/campaigns" className="btn btn-ghost btn-icon">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="page-title">{campaign.name}</h1>
          <span className={`badge badge-${statusColors[campaign.status] || 'gray'}`}>
            {campaign.status.charAt(0) + campaign.status.slice(1).toLowerCase()}
          </span>
        </div>
        <div className="main-header-right">
          {campaign.status === 'DRAFT' && (
            <Link href={`/campaigns/new`} className="btn btn-primary btn-sm">
              <Send size={14} /> New Campaign
            </Link>
          )}
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {[
            { label: 'Total Recipients', value: formatNumber(campaign.totalRecipients), icon: Users, color: 'var(--brand-600)' },
            { label: 'Sent', value: formatNumber(campaign.sentCount), icon: Send, color: 'var(--text-primary)' },
            { label: 'Delivered', value: formatNumber(campaign.deliveredCount), icon: CheckCircle, color: 'var(--success-600)' },
            { label: 'Failed', value: formatNumber(campaign.failedCount), icon: XCircle, color: campaign.failedCount > 0 ? 'var(--error-500)' : 'var(--text-tertiary)' },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
          {/* Main info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Message content */}
            <div className="card">
              <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card-title">Message Content</div>
                <span className={`badge badge-${campaign.channel === 'WHATSAPP' ? 'whatsapp' : 'brand'}`}>
                  {campaign.channel === 'WHATSAPP' ? <MessageSquare size={12} /> : <Mail size={12} />}
                  {campaign.channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}
                </span>
              </div>

              {messageConfig?.subject && (
                <div style={{ marginBottom: 'var(--space-3)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Subject</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>{messageConfig.subject}</div>
                </div>
              )}

              <div style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)', fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)', lineHeight: '1.7', whiteSpace: 'pre-wrap',
                minHeight: '80px',
              }}>
                {messageConfig?.text || <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No message content</span>}
              </div>
            </div>

            {/* Performance */}
            {campaign.sentCount > 0 && (
              <div className="card">
                <div className="card-title" style={{ marginBottom: 'var(--space-5)' }}>Performance</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {[
                    { label: 'Delivery Rate', value: deliveryRate, color: 'var(--success-500)' },
                    { label: 'Read Rate', value: readRate, color: 'var(--brand-500)' },
                  ].map((metric) => (
                    <div key={metric.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: '500', color: 'var(--text-secondary)' }}>{metric.label}</span>
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: metric.color }}>{metric.value}%</span>
                      </div>
                      <div className="progress">
                        <div className="progress-bar" style={{ width: `${metric.value}%`, background: metric.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div className="card">
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-4)' }}>
                Campaign Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Audience', value: campaign.audienceType === 'ALL' ? 'All contacts' : 'Contact list' },
                  { label: 'Schedule', value: campaign.scheduleType === 'IMMEDIATE' ? 'Sent immediately' : 'Scheduled' },
                  campaign.scheduledAt && { label: 'Scheduled for', value: formatDate(campaign.scheduledAt) },
                  campaign.sentAt && { label: 'Sent at', value: formatDateTime(campaign.sentAt) },
                  campaign.completedAt && { label: 'Completed at', value: formatDateTime(campaign.completedAt) },
                  { label: 'Created', value: formatDate(campaign.createdAt) },
                ].filter(Boolean).map((item: any) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: '500', flexShrink: 0 }}>{item.label}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: '600', textAlign: 'right' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/campaigns/new" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Create Similar Campaign
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
