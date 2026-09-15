// src/app/(app)/settings/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, CheckCircle, User } from 'lucide-react'
import type { Metadata } from 'next'

export default function ProfileSettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', timezone: 'UTC', locale: 'en' })

  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(data => {
      if (data?.user) {
        setForm(f => ({ ...f, name: data.user.name || '', email: data.user.email || '' }))
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
      else { const d = await res.json(); setError(d.error || 'Failed to save.') }
    } catch { setError('Something went wrong.') }
    finally { setLoading(false) }
  }

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Profile Settings</h1>
      </div>
      <div className="page-content">
        <div style={{ maxWidth: '520px' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--error-50)', border: '1px solid var(--error-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <AlertCircle size={16} color="var(--error-500)" /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--error-600)' }}>{error}</span>
            </div>
          )}
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--success-50)', border: '1px solid var(--success-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <CheckCircle size={16} color="var(--success-500)" /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--success-600)' }}>Profile saved!</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="card">
              <div className="card-header" style={{ marginBottom: 'var(--space-5)' }}>
                <div className="card-title">Personal Information</div>
              </div>
              <div className="form-group">
                <label htmlFor="profile-name" className="form-label">Full Name</label>
                <input id="profile-name" type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
              </div>
              <div className="form-group">
                <label htmlFor="profile-email" className="form-label">Email Address</label>
                <input id="profile-email" type="email" className="form-input" value={form.email} disabled style={{ opacity: 0.6 }} />
                <span className="form-hint">Email cannot be changed here. Contact support.</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <select className="form-input" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Paris">Europe/Paris (CET)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Language</label>
                  <select className="form-input" value={form.locale} onChange={e => setForm({ ...form, locale: e.target.value })}>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="es">Spanish</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
