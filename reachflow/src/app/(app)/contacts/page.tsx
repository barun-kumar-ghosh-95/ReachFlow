// src/app/(app)/contacts/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Upload, Search, Filter, MoreHorizontal, MessageSquare, Mail } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contacts' }

async function getContacts(workspaceId: string, search: string, page: number) {
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const where = {
    workspaceId,
    status: { not: 'ARCHIVED' as const },
    ...(search ? {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        tags: { include: { tag: true } },
      },
    }),
    prisma.contact.count({ where }),
  ])

  return { contacts, total, pages: Math.ceil(total / pageSize) }
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string }
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!membership) redirect('/login')

  const search = searchParams.q || ''
  const page = parseInt(searchParams.page || '1')
  const { contacts, total, pages } = await getContacts(membership.workspace.id, search, page)

  return (
    <>
      <div className="main-header">
        <div className="main-header-left">
          <h1 className="page-title">Contacts</h1>
          <span className="badge badge-gray">{total.toLocaleString()}</span>
        </div>
        <div className="main-header-right">
          <Link href="/contacts/import" className="btn btn-secondary btn-sm">
            <Upload size={14} /> Import CSV
          </Link>
          <Link href="/contacts/new" className="btn btn-primary btn-sm" id="contacts-add-new">
            <Plus size={14} /> Add contact
          </Link>
        </div>
      </div>

      <div className="page-content">
        {/* Search + Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', alignItems: 'center' }}>
          <form style={{ flex: 1, display: 'flex', gap: 'var(--space-3)' }}>
            <div className="search-wrapper" style={{ flex: 1, maxWidth: '400px' }}>
              <Search size={16} className="search-icon" />
              <input
                name="q"
                type="search"
                className="form-input search-input"
                placeholder="Search by name, email, or phone..."
                defaultValue={search}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              <Filter size={14} /> Filter
            </button>
          </form>
        </div>

        {/* Table */}
        {contacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Upload size={28} />
            </div>
            <div className="empty-state-title">
              {search ? 'No contacts found' : 'No contacts yet'}
            </div>
            <div className="empty-state-description">
              {search
                ? `No contacts match "${search}". Try a different search.`
                : 'Add your first contact or import a CSV file to get started.'}
            </div>
            {!search && (
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Link href="/contacts/new" className="btn btn-primary btn-sm">
                  <Plus size={14} /> Add contact
                </Link>
                <Link href="/contacts/import" className="btn btn-secondary btn-sm">
                  <Upload size={14} /> Import CSV
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Channels</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>
                        <Link href={`/contacts/${contact.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <div className="avatar avatar-sm" style={{ background: `hsl(${(contact.id.charCodeAt(0) * 30) % 360}deg, 60%, 55%)` }}>
                              {(contact.firstName?.[0] || contact.email?.[0] || '?').toUpperCase()}
                            </div>
                            <span style={{ color: 'var(--accent)' }}>
                              {[contact.firstName, contact.lastName].filter(Boolean).join(' ') || '—'}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                        {contact.email || '—'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                        {contact.phone || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                          {contact.whatsappOptIn && (
                            <span title="WhatsApp opted in">
                              <MessageSquare size={14} color="#15803d" />
                            </span>
                          )}
                          {contact.emailOptIn && (
                            <span title="Email opted in">
                              <Mail size={14} color="var(--brand-600)" />
                            </span>
                          )}
                          {!contact.whatsappOptIn && !contact.emailOptIn && (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>None</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${contact.status === 'ACTIVE' ? 'success' : contact.status === 'UNSUBSCRIBED' ? 'warning' : 'gray'}`}>
                          {contact.status.charAt(0) + contact.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                        {formatDate(contact.createdAt)}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-icon-sm" aria-label="More options">
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
                {page > 1 && (
                  <Link href={`/contacts?page=${page - 1}${search ? `&q=${search}` : ''}`} className="btn btn-secondary btn-sm">
                    Previous
                  </Link>
                )}
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0 var(--space-3)' }}>
                  Page {page} of {pages}
                </span>
                {page < pages && (
                  <Link href={`/contacts?page=${page + 1}${search ? `&q=${search}` : ''}`} className="btn btn-secondary btn-sm">
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
