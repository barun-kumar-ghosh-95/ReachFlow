// src/app/(app)/contacts/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, AlertCircle, CheckCircle, User, Phone, Mail, MessageSquare } from 'lucide-react'

export default function NewContactPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsappOptIn: false,
    emailOptIn: false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.email && !form.phone) {
      setError('Please provide at least an email or phone number.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create contact.')
        return
      }
      setSuccess(true)
      setTimeout(() => router.push('/contacts'), 1000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <Link href="/contacts" className="btn btn-ghost btn-icon">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="page-title">Add Contact</h1>
        </div>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: '560px' }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              background: 'var(--error-50)', border: '1px solid var(--error-100)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
            }}>
              <AlertCircle size={16} color="var(--error-500)" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--error-600)' }}>{error}</span>
            </div>
          )}

          {success && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              background: 'var(--success-50)', border: '1px solid var(--success-100)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
            }}>
              <CheckCircle size={16} color="var(--success-500)" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--success-600)' }}>Contact created! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="card-header" style={{ marginBottom: 'var(--space-5)' }}>
                <div>
                  <div className="card-title">Contact Information</div>
                  <div className="card-description">Add a new contact to your workspace</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label htmlFor="firstName" className="form-label">
                    <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className="form-input"
                    placeholder="Sarah"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName" className="form-label">Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    className="form-input"
                    placeholder="Johnson"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <Mail size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  placeholder="sarah@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone" className="form-label">
                  <Phone size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <span className="form-hint">Include country code for WhatsApp (e.g., +91 for India)</span>
              </div>

              {/* Opt-ins */}
              <div style={{
                background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-4)', border: '1px solid var(--border)',
                marginTop: 'var(--space-2)',
              }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                  Communication Consent
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.whatsappOptIn}
                      onChange={(e) => setForm({ ...form, whatsappOptIn: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                        <MessageSquare size={14} color="#15803d" /> WhatsApp opted in
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Contact has consented to receive WhatsApp messages</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.emailOptIn}
                      onChange={(e) => setForm({ ...form, emailOptIn: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                        <Mail size={14} color="var(--brand-600)" /> Email opted in
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Contact has consented to receive marketing emails</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
              <Link href="/contacts" className="btn btn-secondary">Cancel</Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || success}
                id="contact-create-submit"
              >
                {loading ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                ) : (
                  'Add Contact'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
