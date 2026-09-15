// src/app/(app)/settings/api/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Key, Info } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'API Access' }

export default async function ApiSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const credentials = await prisma.apiCredential.findMany({
    where: { workspaceId: membership.workspaceId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">API Access</h1>
      </div>
      <div className="page-content">
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', background: 'var(--info-50)', border: '1px solid var(--info-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <Info size={16} color="var(--info-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--info-600)', lineHeight: '1.6' }}>
              API access is available on Starter and above plans. Add your WhatsApp Business API credentials and email provider keys here to send real messages.
            </span>
          </div>

          {/* WhatsApp section */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: '18px' }}>💬</span> WhatsApp Business API
                </div>
                <div className="card-description">Connect your official WhatsApp Business Cloud API</div>
              </div>
              <span className={`badge ${credentials.some(c => c.provider === 'WHATSAPP' && c.status === 'CONNECTED') ? 'badge-success' : 'badge-gray'}`}>
                {credentials.some(c => c.provider === 'WHATSAPP' && c.status === 'CONNECTED') ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                { key: 'WHATSAPP_ACCESS_TOKEN', label: 'Access Token', placeholder: 'EAAxxxxx...' },
                { key: 'WHATSAPP_PHONE_NUMBER_ID', label: 'Phone Number ID', placeholder: '1234567890' },
                { key: 'WHATSAPP_BUSINESS_ACCOUNT_ID', label: 'Business Account ID', placeholder: '9876543210' },
              ].map((field) => (
                <div key={field.key} className="form-group">
                  <label className="form-label">{field.label}</label>
                  <input type="password" className="form-input" placeholder={field.placeholder} defaultValue="" style={{ fontFamily: 'monospace' }} />
                </div>
              ))}
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                Get these credentials from your{' '}
                <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Meta Developer Dashboard</a>.
                In demo mode, no API key is needed.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-sm" onClick={() => alert('API key integration requires backend API endpoint /api/workspaces/[id]/credentials — coming soon!')}>
                  Save WhatsApp Credentials
                </button>
              </div>
            </div>
          </div>

          {/* Email section */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: '18px' }}>📧</span> Email Provider
                </div>
                <div className="card-description">Connect Resend, SendGrid, or SMTP</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Provider</label>
              <select className="form-input">
                <option value="demo">Demo (no emails sent)</option>
                <option value="resend">Resend</option>
                <option value="sendgrid">SendGrid</option>
                <option value="smtp">SMTP</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">API Key</label>
              <input type="password" className="form-input" placeholder="re_xxxxxxxxxxxxx" style={{ fontFamily: 'monospace' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={() => alert('Email provider integration — coming soon!')}>
                Save Email Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
