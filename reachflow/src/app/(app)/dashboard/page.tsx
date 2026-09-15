// src/app/(app)/dashboard/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, Upload, FileText, Send, TrendingUp, ArrowRight,
  MessageSquare, Mail, Users, Megaphone, CheckCircle, Zap
} from 'lucide-react'
import { formatDate, formatNumber, formatRelativeTime } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

async function getDashboardData(workspaceId: string) {
  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    usage,
    subscription,
    recentCampaigns,
    contactCount,
    campaignCount,
    sentThisMonth,
    deliveredThisMonth,
  ] = await Promise.all([
    prisma.usage.findFirst({
      where: { workspaceId, metric: 'messages_sent', channel: 'all', period },
    }),
    prisma.subscription.findFirst({
      where: { workspaceId, status: 'ACTIVE' },
      include: { plan: { include: { features: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.campaign.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true, name: true, channel: true, status: true,
        sentCount: true, deliveredCount: true, totalRecipients: true,
        scheduledAt: true, completedAt: true, createdAt: true,
      },
    }),
    prisma.contact.count({ where: { workspaceId, status: 'ACTIVE' } }),
    prisma.campaign.count({ where: { workspaceId, status: { in: ['SENDING', 'SCHEDULED'] } } }),
    prisma.message.count({
      where: {
        workspaceId,
        createdAt: { gte: thirtyDaysAgo },
        status: { not: 'CANCELLED' },
      },
    }),
    prisma.message.count({
      where: {
        workspaceId,
        status: { in: ['DELIVERED', 'READ'] },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ])

  const limit = parseInt(
    subscription?.plan.features.find((f) => f.key === 'messages_per_month')?.value || '30'
  )

  return {
    usage: usage?.count || 0,
    limit,
    remaining: Math.max(0, limit - (usage?.count || 0)),
    subscription,
    recentCampaigns,
    contactCount,
    activeCampaignCount: campaignCount,
    deliveryRate: sentThisMonth > 0 ? Math.round((deliveredThisMonth / sentThisMonth) * 100) : 0,
    sentThisMonth,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })

  if (!membership) {
    redirect('/login')
  }

  const data = await getDashboardData(membership.workspace.id)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = session.user.name?.split(' ')[0] || 'there'

  // Onboarding checklist
  const [hasContacts, hasTemplate, hasCampaign] = await Promise.all([
    prisma.contact.findFirst({ where: { workspaceId: membership.workspace.id } }),
    prisma.template.findFirst({ where: { workspaceId: membership.workspace.id } }),
    prisma.campaign.findFirst({ where: { workspaceId: membership.workspace.id, status: { not: 'DRAFT' } } }),
  ])

  const hasIntegration = await prisma.apiCredential.findFirst({
    where: { workspaceId: membership.workspace.id, status: 'CONNECTED' },
  })

  const onboardingSteps = [
    { label: 'Create workspace', done: true },
    { label: 'Add contacts', done: !!hasContacts },
    { label: 'Connect a channel', done: !!hasIntegration },
    { label: 'Create a template', done: !!hasTemplate },
    { label: 'Launch first campaign', done: !!hasCampaign },
  ]
  const onboardingComplete = onboardingSteps.every((s) => s.done)
  const onboardingPercent = Math.round((onboardingSteps.filter((s) => s.done).length / onboardingSteps.length) * 100)

  const usagePercent = data.limit > 0 ? Math.min(100, Math.round((data.usage / data.limit) * 100)) : 0

  return (
    <>
      {/* Demo banner */}
      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
        <div className="demo-banner">
          <Zap size={14} />
          Demo Mode — No real messages are being sent. All provider integrations are simulated.
        </div>
      )}

      {/* Header */}
      <div className="main-header">
        <div className="main-header-left">
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: '500' }}>{greeting}</div>
            <h1 className="page-title">{firstName} 👋</h1>
          </div>
        </div>
        <div className="main-header-right">
          <Link href="/campaigns/new" className="btn btn-primary btn-sm" id="dashboard-new-campaign">
            <Plus size={16} />
            New Campaign
          </Link>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
            {/* Messages Used */}
            <div className="stat-card">
              <div className="stat-label">Messages Used</div>
              <div className="stat-value" style={{ color: 'var(--brand-600)' }}>{formatNumber(data.usage)}</div>
              <div className="progress" style={{ marginTop: 'var(--space-3)' }}>
                <div className="progress-bar" style={{ width: `${usagePercent}%`, background: usagePercent > 80 ? 'var(--error-500)' : 'var(--gradient-brand)' }} />
              </div>
              <div className="stat-change neutral" style={{ marginTop: 'var(--space-2)' }}>
                {usagePercent}% of {formatNumber(data.limit)} limit
              </div>
            </div>

            {/* Remaining */}
            <div className="stat-card">
              <div className="stat-label">Remaining</div>
              <div className="stat-value" style={{ color: data.remaining < 10 ? 'var(--error-500)' : 'var(--success-600)' }}>
                {formatNumber(data.remaining)}
              </div>
              <div className="stat-change neutral">
                This billing period
              </div>
            </div>

            {/* Active campaigns */}
            <div className="stat-card">
              <div className="stat-label">Active Campaigns</div>
              <div className="stat-value">{data.activeCampaignCount}</div>
              <div className="stat-change neutral">Sending or scheduled</div>
            </div>

            {/* Delivery rate */}
            <div className="stat-card">
              <div className="stat-label">Delivery Rate</div>
              <div className="stat-value" style={{ color: 'var(--success-600)' }}>
                {data.deliveryRate}%
              </div>
              <div className={`stat-change ${data.deliveryRate >= 95 ? 'positive' : data.deliveryRate >= 80 ? 'neutral' : 'negative'}`}>
                {data.sentThisMonth} sent this month
              </div>
            </div>
          </div>

          {/* Main content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
            {/* Recent campaigns */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-header" style={{ padding: 'var(--space-5) var(--space-5) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="card-title">Recent Campaigns</div>
                  <div className="card-description">Your latest campaign activity</div>
                </div>
                <Link href="/campaigns" className="btn btn-ghost btn-sm">
                  View all <ArrowRight size={14} />
                </Link>
              </div>

              {data.recentCampaigns.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-12)' }}>
                  <div className="empty-state-icon">
                    <Megaphone size={28} />
                  </div>
                  <div className="empty-state-title">No campaigns yet</div>
                  <div className="empty-state-description">
                    Create your first campaign to start reaching your audience.
                  </div>
                  <Link href="/campaigns/new" className="btn btn-primary btn-sm">
                    <Plus size={16} /> Create campaign
                  </Link>
                </div>
              ) : (
                <div>
                  {data.recentCampaigns.map((campaign) => {
                    const deliveryRate = campaign.sentCount > 0
                      ? Math.round((campaign.deliveredCount / campaign.sentCount) * 100)
                      : 0

                    return (
                      <Link
                        key={campaign.id}
                        href={`/campaigns/${campaign.id}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                          padding: 'var(--space-4) var(--space-5)',
                          borderBottom: '1px solid var(--border)',
                          textDecoration: 'none',
                          transition: 'background var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = ''}
                      >
                        {/* Channel icon */}
                        <div style={{
                          width: '36px', height: '36px', borderRadius: 'var(--radius-md)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          background: campaign.channel === 'WHATSAPP' ? '#dcfce7' : 'var(--brand-50)',
                          color: campaign.channel === 'WHATSAPP' ? '#15803d' : 'var(--brand-600)',
                        }}>
                          {campaign.channel === 'WHATSAPP' ? <MessageSquare size={18} /> : <Mail size={18} />}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {campaign.name}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            {campaign.totalRecipients} recipients · {formatRelativeTime(campaign.createdAt)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span className={`badge badge-${
                            campaign.status === 'COMPLETED' ? 'success' :
                            campaign.status === 'SENDING' || campaign.status === 'PROCESSING' ? 'brand' :
                            campaign.status === 'FAILED' ? 'error' :
                            campaign.status === 'SCHEDULED' ? 'warning' :
                            'gray'
                          }`}>
                            {campaign.status.charAt(0) + campaign.status.slice(1).toLowerCase()}
                          </span>
                          {campaign.sentCount > 0 && (
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--success-600)', fontWeight: '600', marginTop: '4px' }}>
                              {deliveryRate}% delivered
                            </div>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Onboarding checklist */}
              {!onboardingComplete && (
                <div className="onboarding-card">
                  <div className="onboarding-title">Get started with ReachFlow</div>
                  <div className="onboarding-subtitle">{onboardingPercent}% complete</div>
                  <div className="onboarding-progress">
                    <div className="onboarding-progress-fill" style={{ width: `${onboardingPercent}%` }} />
                  </div>
                  <div className="onboarding-steps">
                    {onboardingSteps.map((step) => (
                      <div key={step.label} className={`onboarding-step${step.done ? ' completed' : ''}`}>
                        <div className="onboarding-step-check">
                          {step.done && <CheckCircle size={12} />}
                        </div>
                        {step.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="card">
                <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="card-title">Quick Actions</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {[
                    { href: '/campaigns/new', icon: Plus, label: 'Create Campaign', description: 'Launch a new campaign' },
                    { href: '/contacts', icon: Users, label: 'Add Contacts', description: 'Manage your audience' },
                    { href: '/contacts/import', icon: Upload, label: 'Import CSV', description: 'Bulk import contacts' },
                    { href: '/templates', icon: FileText, label: 'Create Template', description: 'Reusable messages' },
                  ].map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', textDecoration: 'none',
                        transition: 'all var(--transition-fast)', background: 'var(--surface)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--brand-50)'
                        e.currentTarget.style.borderColor = 'var(--brand-200)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface)'
                        e.currentTarget.style.borderColor = 'var(--border)'
                      }}
                    >
                      <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                        <action.icon size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>{action.label}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{action.description}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Plan */}
              <div className="card" style={{ background: data.subscription?.plan.name === 'FREE' ? 'var(--surface)' : 'linear-gradient(135deg, var(--brand-50) 0%, #ffffff 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Plan</div>
                    <div style={{ fontSize: 'var(--text-xl)', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em', marginTop: 'var(--space-1)' }}>
                      {data.subscription?.plan.displayName || 'Free'}
                    </div>
                  </div>
                  <div className="badge badge-brand">
                    {data.subscription?.plan.price === 0 ? 'Free' : `$${data.subscription?.plan.price}/mo`}
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                  {data.usage} of {data.limit} messages used this period
                </div>
                {data.subscription?.plan.name === 'FREE' && (
                  <Link href="/billing" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    Upgrade to Starter <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Contacts overview */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Contacts Overview</div>
                <div className="card-description">{formatNumber(data.contactCount)} active contacts in your workspace</div>
              </div>
              <Link href="/contacts" className="btn btn-secondary btn-sm">
                Manage contacts
              </Link>
            </div>

            {data.contactCount === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                  No contacts yet. Add your first contact or import a CSV to get started.
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
                  <Link href="/contacts" className="btn btn-secondary btn-sm">
                    <Plus size={14} /> Add contact
                  </Link>
                  <Link href="/contacts/import" className="btn btn-primary btn-sm">
                    <Upload size={14} /> Import CSV
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', paddingTop: 'var(--space-2)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 'var(--text-3xl)', fontWeight: '800', color: 'var(--success-600)', letterSpacing: '-0.03em' }}>
                    {formatNumber(data.contactCount)}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: '600' }}>Active</div>
                </div>
                <Link href="/contacts" className="btn btn-ghost btn-sm">
                  View all contacts <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
