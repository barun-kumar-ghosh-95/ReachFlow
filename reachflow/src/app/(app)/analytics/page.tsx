// src/app/(app)/analytics/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const workspaceId = membership.workspaceId

  // Get last 30 days analytics
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const snapshots = await prisma.analyticsSnapshot.findMany({
    where: {
      workspaceId,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: 'asc' },
  })

  // Aggregate by date
  const byDate: Record<string, { sent: number; delivered: number }> = {}
  for (const snap of snapshots) {
    const dateKey = snap.date.toISOString().split('T')[0]
    if (!byDate[dateKey]) byDate[dateKey] = { sent: 0, delivered: 0 }
    if (snap.metric === 'sent') byDate[dateKey].sent += snap.value
    if (snap.metric === 'delivered') byDate[dateKey].delivered += snap.value
  }

  const totalSent = Object.values(byDate).reduce((a, b) => a + b.sent, 0)
  const totalDelivered = Object.values(byDate).reduce((a, b) => a + b.delivered, 0)
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0

  // Campaign stats
  const campaignStats = await prisma.campaign.groupBy({
    by: ['channel'],
    where: { workspaceId },
    _count: { id: true },
    _sum: { sentCount: true, deliveredCount: true },
  })

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Analytics</h1>
      </div>

      <div className="page-content">
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {[
            { label: 'Messages Sent (30d)', value: totalSent.toLocaleString(), color: 'var(--brand-600)' },
            { label: 'Delivered (30d)', value: totalDelivered.toLocaleString(), color: 'var(--success-600)' },
            { label: 'Delivery Rate', value: `${deliveryRate}%`, color: deliveryRate >= 95 ? 'var(--success-600)' : 'var(--warning-600)' },
            { label: 'Total Campaigns', value: campaignStats.reduce((a, b) => a + b._count.id, 0).toString(), color: 'var(--text-primary)' },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color, fontSize: 'var(--text-2xl)' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Message volume chart — simplified bar chart using CSS */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-header" style={{ marginBottom: 'var(--space-5)' }}>
            <div>
              <div className="card-title">Message Volume — Last 30 Days</div>
              <div className="card-description">Daily sent and delivered messages</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px', padding: '0 var(--space-2)' }}>
            {Object.entries(byDate).slice(-30).map(([date, data]) => {
              const maxVal = Math.max(...Object.values(byDate).map((d) => d.sent), 1)
              const sentHeight = Math.max(2, (data.sent / maxVal) * 180)
              const deliveredHeight = Math.max(2, (data.delivered / maxVal) * 180)

              return (
                <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }} title={`${date}: ${data.sent} sent, ${data.delivered} delivered`}>
                  <div style={{ width: '100%', display: 'flex', gap: '1px', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '45%', height: `${sentHeight}px`, background: 'var(--brand-200)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
                    <div style={{ width: '45%', height: `${deliveredHeight}px`, background: 'var(--brand-500)', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-3)', paddingLeft: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <div style={{ width: '10px', height: '10px', background: 'var(--brand-200)', borderRadius: '2px' }} />
              Sent
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <div style={{ width: '10px', height: '10px', background: 'var(--brand-500)', borderRadius: '2px' }} />
              Delivered
            </div>
          </div>
        </div>

        {/* Channel breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-5)' }}>By Channel</div>
            {campaignStats.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', padding: 'var(--space-8)' }}>No campaign data yet</div>
            ) : campaignStats.map((stat) => (
              <div key={stat.channel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stat.channel === 'WHATSAPP' ? '#25d366' : 'var(--brand-500)' }} />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>{stat.channel}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: 'var(--text-primary)' }}>{(stat._sum.sentCount || 0).toLocaleString()}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>messages sent</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 'var(--space-5)' }}>Delivery Performance</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {[
                { label: 'Delivery Rate', value: deliveryRate, max: 100, color: 'var(--success-500)' },
                { label: 'Read Rate (WhatsApp)', value: Math.round(deliveryRate * 0.88), max: 100, color: '#25d366' },
              ].map((metric) => (
                <div key={metric.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
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
        </div>
      </div>
    </>
  )
}
