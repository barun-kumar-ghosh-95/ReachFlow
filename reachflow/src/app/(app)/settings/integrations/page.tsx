// src/app/(app)/settings/integrations/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { MessageSquare, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Integrations' }

export default async function IntegrationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const credentials = await prisma.apiCredential.findMany({
    where: { workspaceId: membership.workspaceId },
  })

  const whatsappCred = credentials.find((c) => c.provider === 'whatsapp')
  const emailCred = credentials.find((c) => c.provider?.startsWith('email_'))

  const isDemoMode = process.env.DEMO_MODE === 'true'

  const integrations = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Official Meta WhatsApp Business Cloud API. Required to send real WhatsApp campaigns.',
      icon: MessageSquare,
      iconBg: '#dcfce7',
      iconColor: '#15803d',
      status: isDemoMode ? 'demo' : whatsappCred?.status || 'DISCONNECTED',
      docs: '/docs/whatsapp',
      settingsHref: '/settings/integrations/whatsapp',
      fields: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID'],
    },
    {
      id: 'email',
      name: 'Email Provider',
      description: 'Send email campaigns via Resend, SendGrid, Amazon SES, or SMTP.',
      icon: Mail,
      iconBg: 'var(--brand-50)',
      iconColor: 'var(--brand-600)',
      status: isDemoMode ? 'demo' : emailCred?.status || 'DISCONNECTED',
      docs: '/docs/email',
      settingsHref: '/settings/integrations/email',
      fields: ['EMAIL_PROVIDER', 'EMAIL_API_KEY'],
    },
  ]

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Integrations</h1>
      </div>

      <div className="page-content">
        {isDemoMode && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <AlertCircle size={16} color="#7c3aed" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: 'var(--text-sm)', color: '#7c3aed', lineHeight: '1.6' }}>
              <strong>Demo Mode is active.</strong> No real provider credentials are needed. All messages are simulated. Configure providers via environment variables to send real messages.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '680px' }}>
          {integrations.map((integration) => {
            const isConnected = integration.status === 'CONNECTED' || integration.status === 'demo'
            const StatusIcon = isConnected ? CheckCircle : XCircle

            return (
              <div key={integration.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: 'var(--radius-xl)', background: integration.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: integration.iconColor, flexShrink: 0 }}>
                    <integration.icon size={26} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {integration.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <StatusIcon size={16} color={isConnected ? 'var(--success-500)' : 'var(--error-500)'} />
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: isConnected ? 'var(--success-600)' : 'var(--error-600)' }}>
                          {integration.status === 'demo' ? 'Demo Mode' : isConnected ? 'Connected' : 'Not Connected'}
                        </span>
                      </div>
                    </div>

                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: 'var(--space-4)' }}>
                      {integration.description}
                    </p>

                    {!isDemoMode && (
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        Required env vars: {integration.fields.join(', ')}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <a href={integration.settingsHref} className="btn btn-secondary btn-sm">
                        Configure
                      </a>
                      <a href={integration.docs} className="btn btn-ghost btn-sm">
                        Documentation
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
