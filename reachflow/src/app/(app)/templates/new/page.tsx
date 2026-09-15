// src/app/(app)/templates/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Loader2, AlertCircle, MessageSquare, Mail, Sparkles
} from 'lucide-react'

type Channel = 'WHATSAPP' | 'EMAIL'

export default function NewTemplatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    channel: 'WHATSAPP' as Channel,
    category: '',
    subject: '',
    text: '',
  })

  async function generateWithAI() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: form.name ? `Create a template for: ${form.name}` : 'Create a professional marketing message',
          channel: form.channel,
          action: 'generate',
        }),
      })
      const data = await res.json()
      if (data.text) setForm({ ...form, text: data.text })
    } catch {
      // silent fail
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.text) { setError('Message content is required.'); return }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || 'Untitled Template',
          channel: form.channel,
          category: form.category || null,
          content: { text: form.text, subject: form.subject },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create template.'); return }
      router.push('/templates')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const variables = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{phone}}']

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <Link href="/templates" className="btn btn-ghost btn-icon">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="page-title">Create Template</h1>
        </div>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: '720px' }}>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              background: 'var(--error-50)', border: '1px solid var(--error-100)',
              borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)',
            }}>
              <AlertCircle size={16} color="var(--error-500)" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--error-600)' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
              <div className="card-header" style={{ marginBottom: 'var(--space-5)' }}>
                <div className="card-title">Template Details</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label required">Template Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Welcome Message"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Welcome, Promo, Reminder"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
              </div>

              {/* Channel selection */}
              <div className="form-group">
                <label className="form-label">Channel</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  {[
                    { value: 'WHATSAPP' as Channel, label: 'WhatsApp', icon: MessageSquare, color: '#dcfce7', iconColor: '#15803d' },
                    { value: 'EMAIL' as Channel, label: 'Email', icon: Mail, color: 'var(--brand-50)', iconColor: 'var(--brand-600)' },
                  ].map((ch) => (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => setForm({ ...form, channel: ch.value })}
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        border: `2px solid ${form.channel === ch.value ? ch.iconColor : 'var(--border)'}`,
                        borderRadius: 'var(--radius-lg)',
                        background: form.channel === ch.value ? ch.color : 'var(--surface)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <ch.icon size={18} color={ch.iconColor} />
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{ch.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="card-title">Message Content</div>
                <button type="button" onClick={generateWithAI} disabled={aiLoading} className="btn btn-secondary btn-sm">
                  {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                  AI Generate
                </button>
              </div>

              {form.channel === 'EMAIL' && (
                <div className="form-group">
                  <label className="form-label">Subject Line</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Email subject..."
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label required">Message</label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    className="form-input form-textarea"
                    placeholder={form.channel === 'WHATSAPP'
                      ? 'Hi {{first_name}}, your message here...'
                      : 'Dear {{first_name}},\n\nYour email content here...'}
                    value={form.text}
                    onChange={(e) => setForm({ ...form, text: e.target.value })}
                    rows={8}
                    style={{ resize: 'vertical', paddingBottom: '2rem' }}
                  />
                  <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {form.text.length} chars
                  </div>
                </div>
              </div>

              {/* Variable chips */}
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Insert Variable
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="variable-chip"
                      onClick={() => setForm({ ...form, text: form.text + v })}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {form.text && form.channel === 'WHATSAPP' && (
                <div style={{ marginTop: 'var(--space-5)' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: '600', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview</div>
                  <div style={{ background: '#e5ddd5', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                    <div style={{ background: 'white', borderRadius: '8px', padding: 'var(--space-3) var(--space-4)', maxWidth: '85%', marginLeft: 'auto', fontSize: 'var(--text-sm)', lineHeight: '1.5', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                      {form.text.replace('{{first_name}}', 'Sarah').replace('{{last_name}}', 'Johnson').replace('{{email}}', 'sarah@example.com')}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'flex-end' }}>
              <Link href="/templates" className="btn btn-secondary">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={loading} id="template-create-submit">
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
