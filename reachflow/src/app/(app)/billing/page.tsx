// src/app/(app)/billing/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, CreditCard, AlertCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing' }

export default async function BillingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const workspaceId = membership.workspaceId

  const subscription = await prisma.subscription.findFirst({
    where: { workspaceId, status: 'ACTIVE' },
    include: { plan: { include: { features: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const usage = await prisma.usage.findFirst({
    where: { workspaceId, metric: 'messages_sent', channel: 'all', period },
  })

  const payments = await prisma.payment.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const messagesLimit = parseInt(subscription?.plan.features.find((f) => f.key === 'messages_per_month')?.value || '30')
  const messagesUsed = usage?.count || 0
  const usagePercent = Math.min(100, Math.round((messagesUsed / messagesLimit) * 100))

  const allPlans = await prisma.plan.findMany({
    where: { isPublic: true, isActive: true },
    include: { features: true },
    orderBy: { sortOrder: 'asc' },
  })

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Billing</h1>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Current plan */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Current Plan</div>
                  <div className="card-description">Your active subscription details</div>
                </div>
                {subscription?.plan.name === 'FREE' && (
                  <Link href="#plans" className="btn btn-primary btn-sm">
                    Upgrade <ArrowRight size={14} />
                  </Link>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', padding: 'var(--space-5)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-xl)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Plan</div>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: '800', color: 'var(--text-primary)' }}>{subscription?.plan.displayName || 'Free'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Price</div>
                  <div style={{ fontSize: 'var(--text-xl)', fontWeight: '800', color: 'var(--text-primary)' }}>
                    ${subscription?.plan.price || 0}<span style={{ fontSize: 'var(--text-sm)', fontWeight: '500', color: 'var(--text-secondary)' }}>/mo</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>Status</div>
                  <span className="badge badge-success" style={{ fontSize: 'var(--text-sm)' }}>Active</span>
                </div>
              </div>

              {/* Usage meter */}
              <div style={{ marginTop: 'var(--space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>Message Usage This Month</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: usagePercent > 80 ? 'var(--error-500)' : 'var(--text-primary)' }}>
                    {messagesUsed.toLocaleString()} / {messagesLimit.toLocaleString()}
                  </span>
                </div>
                <div className="progress">
                  <div className="progress-bar" style={{
                    width: `${usagePercent}%`,
                    background: usagePercent > 90 ? 'var(--error-500)' : usagePercent > 70 ? 'var(--warning-500)' : 'var(--gradient-brand)',
                  }} />
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)' }}>
                  {Math.max(0, messagesLimit - messagesUsed).toLocaleString()} messages remaining
                  {subscription?.currentPeriodEnd && `. Resets ${subscription.currentPeriodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`}
                </div>
              </div>
            </div>

            {/* Plans */}
            <div id="plans">
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: '800', letterSpacing: '-0.02em', marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}>
                Available Plans
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                {allPlans.map((plan) => {
                  const isCurrentPlan = subscription?.plan.id === plan.id
                  const msgLimit = plan.features.find((f) => f.key === 'messages_per_month')?.value || '0'
                  const contactLimit = plan.features.find((f) => f.key === 'contacts_limit')?.value || '0'

                  return (
                    <div
                      key={plan.id}
                      className={`pricing-card${isCurrentPlan ? ' featured' : ''}`}
                      style={{ position: 'relative' }}
                    >
                      {isCurrentPlan && (
                        <div className="pricing-badge">Current Plan</div>
                      )}
                      <div className="pricing-plan">{plan.name}</div>
                      <div className="pricing-price">
                        <span className="pricing-currency">$</span>
                        <span className="pricing-amount">{plan.price}</span>
                        <span className="pricing-period">/mo</span>
                      </div>
                      <ul className="pricing-features" style={{ marginBottom: 'var(--space-5)' }}>
                        <li className="pricing-feature">
                          <CheckCircle size={14} className="pricing-feature-icon" />
                          {parseInt(msgLimit) === -1 ? 'Unlimited' : parseInt(msgLimit).toLocaleString()} messages/mo
                        </li>
                        <li className="pricing-feature">
                          <CheckCircle size={14} className="pricing-feature-icon" />
                          {parseInt(contactLimit) === -1 ? 'Unlimited' : parseInt(contactLimit).toLocaleString()} contacts
                        </li>
                        {plan.features.slice(2, 5).map((f) => (
                          <li key={f.key} className="pricing-feature">
                            <CheckCircle size={14} className="pricing-feature-icon" />
                            {f.label}
                          </li>
                        ))}
                      </ul>

                      {isCurrentPlan ? (
                        <div className="btn btn-secondary w-full" style={{ justifyContent: 'center', cursor: 'default', opacity: 0.8 }}>
                          Current Plan
                        </div>
                      ) : plan.price === 0 ? (
                        <div className="btn btn-secondary w-full" style={{ justifyContent: 'center', cursor: 'default', opacity: 0.5 }}>
                          Free Plan
                        </div>
                      ) : (
                        <Link href={`/api/billing/checkout?plan=${plan.name}`} className="btn btn-primary w-full" style={{ justifyContent: 'center' }}>
                          <CreditCard size={14} /> Upgrade to {plan.displayName}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Payment history */}
            {payments.length > 0 && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border)' }}>
                  <div className="card-title">Payment History</div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{payment.createdAt.toLocaleDateString()}</td>
                        <td style={{ fontWeight: '600' }}>${payment.amount}</td>
                        <td>
                          <span className={`badge badge-${payment.status === 'SUCCEEDED' ? 'success' : payment.status === 'FAILED' ? 'error' : 'gray'}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td>
                          {payment.invoiceUrl ? (
                            <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 'var(--text-sm)' }}>View</a>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Billing Info</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '2px', fontWeight: '600' }}>BILLING PERIOD</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: '600' }}>
                    {subscription ? `${subscription.currentPeriodStart.toLocaleDateString()} — ${subscription.currentPeriodEnd.toLocaleDateString()}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '2px', fontWeight: '600' }}>RENEWAL DATE</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: '600' }}>
                    {subscription?.currentPeriodEnd.toLocaleDateString() || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: '2px', fontWeight: '600' }}>PAYMENT PROVIDER</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: '600' }}>
                    {subscription?.paymentProvider === 'stripe' ? 'Stripe' : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', background: 'var(--info-50)', border: '1px solid var(--info-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
              <AlertCircle size={16} color="var(--info-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--info-600)', lineHeight: '1.6' }}>
                Payments are processed securely through Stripe. We never store your card details.
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Need Help?</div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Questions about billing? Our team is here to help.
              </p>
              <Link href="/contact" className="btn btn-secondary w-full" style={{ justifyContent: 'center' }}>
                Contact support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
