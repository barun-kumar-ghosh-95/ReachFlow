// src/app/(app)/templates/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, MessageSquare, Mail, Copy, Edit2, Trash2 } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Templates' }

export default async function TemplatesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const templates = await prisma.template.findMany({
    where: { workspaceId: membership.workspaceId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <h1 className="page-title">Templates</h1>
          <span className="badge badge-gray">{templates.length}</span>
        </div>
        <div className="main-header-right">
          <Link href="/templates/new" className="btn btn-primary btn-sm" id="templates-create">
            <Plus size={14} /> Create template
          </Link>
        </div>
      </div>

      <div className="page-content">
        {templates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <MessageSquare size={28} />
            </div>
            <div className="empty-state-title">No templates yet</div>
            <div className="empty-state-description">
              Create reusable message templates for WhatsApp and email campaigns. Templates save time and ensure consistent messaging.
            </div>
            <Link href="/templates/new" className="btn btn-primary">
              <Plus size={16} /> Create your first template
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
            {templates.map((template) => {
              const content = template.content as any
              const previewText = content?.text?.slice(0, 120) || content?.subject || 'No preview available'

              return (
                <div key={template.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
                        background: template.channel === 'WHATSAPP' ? '#dcfce7' : 'var(--brand-50)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: template.channel === 'WHATSAPP' ? '#15803d' : 'var(--brand-600)',
                      }}>
                        {template.channel === 'WHATSAPP' ? <MessageSquare size={16} /> : <Mail size={16} />}
                      </div>
                      <span className={`badge ${template.channel === 'WHATSAPP' ? 'badge-whatsapp' : 'badge-brand'}`}>
                        {template.channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <button className="btn btn-ghost btn-icon-sm" title="Duplicate" aria-label="Duplicate template">
                        <Copy size={14} />
                      </button>
                      <Link href={`/templates/${template.id}/edit`} className="btn btn-ghost btn-icon-sm" title="Edit" aria-label="Edit template">
                        <Edit2 size={14} />
                      </Link>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: '700', color: 'var(--text-primary)', marginBottom: 'var(--space-2)', letterSpacing: '-0.01em' }}>
                    {template.name}
                  </h3>

                  {template.category && (
                    <span className="badge badge-gray" style={{ alignSelf: 'flex-start', marginBottom: 'var(--space-3)' }}>
                      {template.category}
                    </span>
                  )}

                  <div style={{
                    fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                    lineHeight: '1.6', flex: 1,
                    background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
                    fontFamily: template.channel === 'WHATSAPP' ? 'inherit' : 'inherit',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {previewText}{previewText.length === 120 ? '...' : ''}
                  </div>

                  {template.variables.length > 0 && (
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                      {template.variables.map((v) => (
                        <span key={v} className="variable-chip">{v}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {formatRelativeTime(template.createdAt)}
                    </span>
                    <Link href={`/campaigns/new?templateId=${template.id}`} className="btn btn-primary btn-sm">
                      Use template
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
