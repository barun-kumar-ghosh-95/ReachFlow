// src/app/(app)/settings/workspace/WorkspaceSettingsForm.tsx
'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  website?: string | null
  industry?: string | null
  timezone: string
}

export function WorkspaceSettingsForm({ workspace }: { workspace: Workspace }) {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: workspace.name,
    website: workspace.website || '',
    industry: workspace.industry || '',
    timezone: workspace.timezone,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSaved(false)
    try {
      const res = await fetch(`/api/workspaces/${workspace.id}`, {
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
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--error-50)', border: '1px solid var(--error-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <AlertCircle size={16} color="var(--error-500)" /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--error-600)' }}>{error}</span>
        </div>
      )}
      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--success-50)', border: '1px solid var(--success-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <CheckCircle size={16} color="var(--success-500)" /><span style={{ fontSize: 'var(--text-sm)', color: 'var(--success-600)' }}>Workspace saved!</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="card-title">Workspace Details</div>
          </div>
          <div className="form-group">
            <label className="form-label required">Workspace Name</label>
            <input type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Slug</label>
            <input type="text" className="form-input" value={workspace.slug} disabled style={{ opacity: 0.6 }} />
            <span className="form-hint">Workspace slug cannot be changed.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Website</label>
            <input type="url" className="form-input" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://yourcompany.com" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Industry</label>
              <select className="form-input" value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
                <option value="">Select industry</option>
                <option value="ecommerce">E-commerce</option>
                <option value="saas">SaaS</option>
                <option value="retail">Retail</option>
                <option value="healthcare">Healthcare</option>
                <option value="education">Education</option>
                <option value="finance">Finance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select className="form-input" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                <option value="UTC">UTC</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
