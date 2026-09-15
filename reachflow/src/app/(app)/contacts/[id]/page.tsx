// src/app/(app)/contacts/[id]/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, Mail, Phone, MessageSquare, Calendar, Tag,
  Edit2, Trash2, CheckCircle, XCircle
} from 'lucide-react'
import { formatDate, formatDateTime, getInitials } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contact Detail' }

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, workspaceId: membership.workspaceId },
    include: {
      tags: { include: { tag: true } },
    },
  })

  if (!contact) notFound()

  // Recent messages to this contact
  const recentMessages = await prisma.message.findMany({
    where: { contactId: contact.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { campaign: { select: { name: true } } },
  })

  const fullName = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Unknown'
  const initials = getInitials(fullName)
  const avatarHue = (contact.id.charCodeAt(0) * 30) % 360

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <Link href="/contacts" className="btn btn-ghost btn-icon">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="page-title">{fullName}</h1>
          <span className={`badge badge-${contact.status === 'ACTIVE' ? 'success' : contact.status === 'UNSUBSCRIBED' ? 'warning' : 'gray'}`}>
            {contact.status.charAt(0) + contact.status.slice(1).toLowerCase()}
          </span>
        </div>
        <div className="main-header-right">
          <Link href={`/contacts/${contact.id}/edit`} className="btn btn-secondary btn-sm">
            <Edit2 size={14} /> Edit
          </Link>
        </div>
      </div>

      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--space-6)' }}>
          {/* Left: Contact info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div
                className="avatar"
                style={{
                  width: '72px', height: '72px', fontSize: 'var(--text-2xl)',
                  background: `hsl(${avatarHue}deg, 60%, 55%)`,
                  margin: '0 auto var(--space-4)',
                }}
              >
                {initials}
              </div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: '800', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>{fullName}</div>
              {contact.email && (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '4px' }}>{contact.email}</div>
              )}
              {contact.phone && (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{contact.phone}</div>
              )}
            </div>

            <div className="card">
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-4)' }}>
                Contact Details
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {contact.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Mail size={16} color="var(--text-tertiary)" />
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Phone size={16} color="var(--text-tertiary)" />
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{contact.phone}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <Calendar size={16} color="var(--text-tertiary)" />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Added {formatDate(contact.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-4)' }}>
                Consent Status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                    <MessageSquare size={14} color="#15803d" /> WhatsApp
                  </div>
                  {contact.whatsappOptIn
                    ? <CheckCircle size={16} color="var(--success-500)" />
                    : <XCircle size={16} color="var(--error-400)" />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                    <Mail size={14} color="var(--brand-600)" /> Email
                  </div>
                  {contact.emailOptIn
                    ? <CheckCircle size={16} color="var(--success-500)" />
                    : <XCircle size={16} color="var(--error-400)" />}
                </div>
              </div>
            </div>

            {contact.tags.length > 0 && (
              <div className="card">
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                  Tags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {contact.tags.map((ct) => (
                    <span key={ct.tagId} className="badge badge-brand">
                      <Tag size={10} /> {ct.tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Message history */}
          <div>
            <div className="card" style={{ padding: 0 }}>
              <div className="card-header" style={{ padding: 'var(--space-5)', borderBottom: '1px solid var(--border)' }}>
                <div className="card-title">Message History</div>
              </div>

              {recentMessages.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--space-10)' }}>
                  <div className="empty-state-icon"><MessageSquare size={24} /></div>
                  <div className="empty-state-title">No messages yet</div>
                  <div className="empty-state-description">This contact hasn't been part of any campaigns yet.</div>
                  <Link href="/campaigns/new" className="btn btn-primary btn-sm">Create Campaign</Link>
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Channel</th>
                        <th>Status</th>
                        <th>Sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMessages.map((msg) => (
                        <tr key={msg.id}>
                          <td style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {msg.campaign?.name || 'Direct message'}
                          </td>
                          <td>
                            <span className={`badge badge-${msg.channel === 'WHATSAPP' ? 'whatsapp' : 'brand'}`}>
                              {msg.channel === 'WHATSAPP' ? <MessageSquare size={10} /> : <Mail size={10} />}
                              {msg.channel === 'WHATSAPP' ? 'WhatsApp' : 'Email'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${msg.status === 'DELIVERED' || msg.status === 'READ' ? 'success' : msg.status === 'FAILED' ? 'error' : 'gray'}`}>
                              {msg.status.charAt(0) + msg.status.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                            {formatDateTime(msg.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
