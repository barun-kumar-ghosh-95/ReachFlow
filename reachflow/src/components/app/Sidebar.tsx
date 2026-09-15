// src/components/app/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Zap, LayoutDashboard, Users, Megaphone, FileText,
  BarChart2, CreditCard, Settings, ShieldCheck, LogOut,
  ChevronRight, Bell, Sparkles
} from 'lucide-react'
import { getInitials } from '@/lib/utils'

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  workspace?: {
    name: string
    plan: string
  } | null
}

const navItems = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
      { href: '/contacts', icon: Users, label: 'Contacts' },
      { href: '/templates', icon: FileText, label: 'Templates' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/analytics', icon: BarChart2, label: 'Analytics' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/billing', icon: CreditCard, label: 'Billing' },
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
]

export function Sidebar({ user, workspace }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="sidebar" aria-label="Main sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <Link href="/dashboard" className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={18} color="white" strokeWidth={2.5} />
          </div>
          <span className="sidebar-logo-text">ReachFlow</span>
        </Link>
      </div>

      {/* Workspace badge */}
      {workspace && (
        <div style={{
          margin: 'var(--space-3) var(--space-3) 0',
          padding: 'var(--space-2) var(--space-3)',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspace.name}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>
              {workspace.plan} plan
            </div>
          </div>
          <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
        </div>
      )}

      {/* Demo mode indicator */}
      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
        <div style={{
          margin: 'var(--space-2) var(--space-3) 0',
          padding: 'var(--space-2) var(--space-3)',
          background: 'rgba(124, 58, 237, 0.2)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.65rem',
          fontWeight: '700',
          color: '#c4b5fd',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          🔬 Demo Mode
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Application navigation">
        {navItems.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-item${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon size={18} className="sidebar-item-icon" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}

        {/* AI shortcut */}
        <div style={{ marginTop: 'var(--space-3)' }}>
          <Link href="/campaigns/new?ai=true" className="sidebar-item" style={{ background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.2)' }}>
            <Sparkles size={18} />
            AI Campaign
            <span className="sidebar-item-badge" style={{ background: 'rgba(124,58,237,0.3)', color: '#c4b5fd' }}>New</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <Link href="/notifications" className="sidebar-item" style={{ marginBottom: 'var(--space-1)' }}>
          <Bell size={18} className="sidebar-item-icon" />
          Notifications
        </Link>
        <div
          className="sidebar-user"
          onClick={() => signOut({ callbackUrl: '/login' })}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && signOut({ callbackUrl: '/login' })}
          title="Sign out"
        >
          <div className="avatar avatar-sm">
            {user.name ? getInitials(user.name) : 'U'}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || 'User'}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
          <LogOut size={14} color="rgba(255,255,255,0.3)" />
        </div>
      </div>
    </aside>
  )
}
