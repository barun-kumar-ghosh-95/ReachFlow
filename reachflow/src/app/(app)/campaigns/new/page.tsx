// src/app/(app)/campaigns/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Mail, ChevronRight, ChevronLeft,
  Users, FileText, Clock, Eye, Send, CheckCircle,
  Loader2, Sparkles, AlertCircle, Info
} from 'lucide-react'

type Channel = 'WHATSAPP' | 'EMAIL'
type ScheduleType = 'IMMEDIATE' | 'SCHEDULED'

interface CampaignForm {
  name: string
  channel: Channel | null
  audienceType: 'LIST' | 'ALL'
  listIds: string[]
  messageText: string
  subject: string
  scheduleType: ScheduleType
  scheduledAt: string
  timezone: string
}

const STEPS = [
  { id: 1, label: 'Channel' },
  { id: 2, label: 'Audience' },
  { id: 3, label: 'Message' },
  { id: 4, label: 'Schedule' },
  { id: 5, label: 'Review' },
]

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<CampaignForm>({
    name: '',
    channel: null,
    audienceType: 'ALL',
    listIds: [],
    messageText: '',
    subject: '',
    scheduleType: 'IMMEDIATE',
    scheduledAt: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [aiLoading, setAiLoading] = useState(false)

  async function generateWithAI() {
    if (!form.channel) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Create a short marketing message',
          channel: form.channel,
          action: 'generate',
        }),
      })
      const data = await res.json()
      if (data.text) {
        setForm({ ...form, messageText: data.text })
      }
    } catch {
      // silent fail - AI is optional
    } finally {
      setAiLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.channel) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || `Campaign ${new Date().toLocaleDateString()}`,
          channel: form.channel,
          audienceType: form.audienceType,
          listIds: form.listIds,
          messageConfig: {
            text: form.messageText,
            subject: form.subject,
          },
          scheduleType: form.scheduleType,
          scheduledAt: form.scheduleType === 'SCHEDULED' ? form.scheduledAt : null,
          timezone: form.timezone,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create campaign.')
        return
      }

      router.push(`/campaigns/${data.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const canNext = () => {
    switch (step) {
      case 1: return !!form.channel
      case 2: return true
      case 3: return form.messageText.length > 0
      case 4: return form.scheduleType === 'IMMEDIATE' || !!form.scheduledAt
      default: return true
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="main-header">
        <div className="main-header-left">
          <button onClick={() => router.back()} className="btn btn-ghost btn-icon">
            <ChevronLeft size={20} />
          </button>
          <h1 className="page-title">New Campaign</h1>
        </div>
      </div>

      <div className="page-content">
        {/* Steps */}
        <div className="steps" style={{ marginBottom: 'var(--space-8)' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
                <div className={`step-number ${step > s.id ? 'completed' : step === s.id ? 'active' : ''}`}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step > s.id ? 'var(--success-500)' : step === s.id ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: step >= s.id ? 'white' : 'var(--text-tertiary)',
                    border: `2px solid ${step > s.id ? 'var(--success-500)' : step === s.id ? 'var(--accent)' : 'var(--border)'}`,
                    fontWeight: '700', fontSize: 'var(--text-sm)', flexShrink: 0,
                    cursor: step > s.id ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    boxShadow: step === s.id ? '0 0 0 4px rgba(90,106,240,0.15)' : 'none',
                  }}
                  onClick={() => step > s.id && setStep(s.id)}
                >
                  {step > s.id ? <CheckCircle size={16} /> : s.id}
                </div>
                <span style={{ fontSize: '0.65rem', fontWeight: '600', color: step === s.id ? 'var(--accent)' : 'var(--text-tertiary)', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: '2px', background: step > s.id ? 'var(--success-500)' : 'var(--border)', margin: '0 var(--space-2)', marginBottom: 'var(--space-5)', transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--error-50)', border: '1px solid var(--error-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
              <AlertCircle size={16} color="var(--error-500)" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--error-600)' }}>{error}</span>
            </div>
          )}

          {/* STEP 1: Channel */}
          {step === 1 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Choose a channel</div>
                  <div className="card-description">Select how you want to reach your audience</div>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-5)' }}>
                <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
                  <label className="form-label required">Campaign name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Summer Sale Announcement"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  {[
                    { value: 'WHATSAPP' as Channel, icon: MessageSquare, label: 'WhatsApp', description: 'Send via official WhatsApp Business Cloud API', color: '#dcfce7', iconColor: '#15803d', badge: 'Official API' },
                    { value: 'EMAIL' as Channel, icon: Mail, label: 'Email', description: 'Send via Resend, SendGrid, Amazon SES, or SMTP', color: 'var(--brand-50)', iconColor: 'var(--brand-600)', badge: 'Multiple providers' },
                  ].map((channel) => (
                    <button
                      key={channel.value}
                      onClick={() => setForm({ ...form, channel: channel.value })}
                      style={{
                        padding: 'var(--space-6)',
                        border: `2px solid ${form.channel === channel.value ? channel.iconColor : 'var(--border)'}`,
                        borderRadius: 'var(--radius-xl)',
                        background: form.channel === channel.value ? channel.color : 'var(--surface)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        boxShadow: form.channel === channel.value ? `0 0 0 4px ${channel.iconColor}22` : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                        <div style={{ width: '44px', height: '44px', background: channel.color, border: `1px solid ${channel.iconColor}33`, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: channel.iconColor }}>
                          <channel.icon size={22} />
                        </div>
                        {form.channel === channel.value && <CheckCircle size={20} color={channel.iconColor} />}
                      </div>
                      <div style={{ fontWeight: '700', fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>{channel.label}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>{channel.description}</div>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', background: channel.color, color: channel.iconColor, padding: '2px 8px', borderRadius: '999px', border: `1px solid ${channel.iconColor}33` }}>
                        {channel.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Audience */}
          {step === 2 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Choose your audience</div>
                  <div className="card-description">Select who will receive this campaign</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { value: 'ALL', label: 'All contacts', description: 'Send to all active, consented contacts in your workspace', icon: Users },
                  { value: 'LIST', label: 'Contact list', description: 'Send to contacts in a specific list', icon: FileText },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, audienceType: opt.value as any })}
                    style={{
                      padding: 'var(--space-4)',
                      border: `2px solid ${form.audienceType === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      background: form.audienceType === opt.value ? 'var(--accent-light)' : 'var(--surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                      <opt.icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{opt.description}</div>
                    </div>
                    {form.audienceType === opt.value && <CheckCircle size={18} color="var(--accent)" style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', background: 'var(--info-50)', border: '1px solid var(--info-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  <Info size={16} color="var(--info-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--info-600)', lineHeight: '1.6' }}>
                    Only contacts who have opted in to {form.channel === 'WHATSAPP' ? 'WhatsApp' : 'email'} communications will be included. Non-consented contacts are automatically excluded.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Message */}
          {step === 3 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Compose your message</div>
                  <div className="card-description">Write the content for your {form.channel === 'WHATSAPP' ? 'WhatsApp' : 'email'} campaign</div>
                </div>
                <button
                  onClick={generateWithAI}
                  disabled={aiLoading}
                  className="btn btn-secondary btn-sm"
                  title="Generate with AI"
                >
                  {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
                  AI Generate
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {form.channel === 'EMAIL' && (
                  <div className="form-group">
                    <label className="form-label required">Subject line</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Your email subject..."
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label required">Message content</label>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      className="form-input form-textarea"
                      placeholder={form.channel === 'WHATSAPP'
                        ? 'Hi {{first_name}}, your message here...'
                        : 'Dear {{first_name}},\n\nYour email content here...'}
                      value={form.messageText}
                      onChange={(e) => setForm({ ...form, messageText: e.target.value })}
                      rows={8}
                      style={{ resize: 'vertical', paddingBottom: '2rem' }}
                    />
                    <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.75rem', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {form.messageText.length} chars
                    </div>
                  </div>
                </div>

                {/* Variable chips */}
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', fontWeight: '600' }}>
                    PERSONALIZATION VARIABLES
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {['{{first_name}}', '{{last_name}}', '{{email}}', '{{phone}}'].map((v) => (
                      <button
                        key={v}
                        className="variable-chip"
                        onClick={() => setForm({ ...form, messageText: form.messageText + v })}
                        title={`Insert ${v}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {form.messageText && form.channel === 'WHATSAPP' && (
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', fontWeight: '600' }}>PREVIEW</div>
                    <div style={{ background: '#e5ddd5', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                      <div style={{ background: 'white', borderRadius: '8px', padding: 'var(--space-3) var(--space-4)', maxWidth: '85%', marginLeft: 'auto', fontSize: 'var(--text-sm)', lineHeight: '1.5', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                        {form.messageText.replace('{{first_name}}', 'Sarah').replace('{{last_name}}', 'Johnson').replace('{{email}}', 'sarah@example.com')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Schedule */}
          {step === 4 && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Schedule your campaign</div>
                  <div className="card-description">Choose when to send this campaign</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {[
                  { value: 'IMMEDIATE', label: 'Send immediately', description: 'Campaign will be queued and sent as soon as possible', icon: Send },
                  { value: 'SCHEDULED', label: 'Schedule for later', description: 'Pick a specific date, time, and timezone', icon: Clock },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, scheduleType: opt.value as ScheduleType })}
                    style={{
                      padding: 'var(--space-4)',
                      border: `2px solid ${form.scheduleType === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-lg)',
                      background: form.scheduleType === opt.value ? 'var(--accent-light)' : 'var(--surface)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-4)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                      <opt.icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{opt.label}</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{opt.description}</div>
                    </div>
                    {form.scheduleType === opt.value && <CheckCircle size={18} color="var(--accent)" style={{ marginLeft: 'auto' }} />}
                  </button>
                ))}

                {form.scheduleType === 'SCHEDULED' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                    <div className="form-group">
                      <label className="form-label required">Date & Time</label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={form.scheduledAt}
                        onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Timezone</label>
                      <input
                        type="text"
                        className="form-input"
                        value={form.timezone}
                        onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                        placeholder="Asia/Kolkata"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Review */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div className="card">
                <div className="card-header">
                  <div className="card-title">Review before sending</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {[
                    { label: 'Campaign name', value: form.name || `Campaign ${new Date().toLocaleDateString()}` },
                    { label: 'Channel', value: form.channel === 'WHATSAPP' ? '📱 WhatsApp' : '📧 Email' },
                    { label: 'Audience', value: form.audienceType === 'ALL' ? 'All consented contacts' : 'Selected list(s)' },
                    { label: 'Schedule', value: form.scheduleType === 'IMMEDIATE' ? 'Send immediately' : `Scheduled: ${form.scheduledAt} (${form.timezone})` },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: '500' }}>{item.label}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: '600', textAlign: 'right', maxWidth: '60%' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message preview */}
              <div className="card">
                <div className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Message Content</div>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                  {form.subject && <div style={{ fontWeight: '700', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>Subject: {form.subject}</div>}
                  {form.messageText}
                </div>
              </div>

              {/* Warning */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', background: 'var(--warning-50)', border: '1px solid var(--warning-100)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
                <AlertCircle size={16} color="var(--warning-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--warning-600)', lineHeight: '1.6' }}>
                  <strong>Confirm before sending.</strong> This campaign will be sent to all eligible, consented contacts. Non-consented contacts will be automatically excluded.
                  {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && ' In Demo Mode, no real messages will be sent.'}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-6)' }}>
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="btn btn-secondary">
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}

            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="btn btn-primary"
                disabled={!canNext()}
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                className="btn btn-primary"
                disabled={loading}
                id="campaign-create-submit"
              >
                {loading ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</>
                ) : (
                  <><Send size={16} /> {form.scheduleType === 'IMMEDIATE' ? 'Send Campaign' : 'Schedule Campaign'}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
