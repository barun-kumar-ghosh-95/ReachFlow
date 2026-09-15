// src/app/(app)/settings/page.tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { User, Building2, Users, Plug, Shield, Key } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

const settingsNav = [
  { href: '/settings/profile', icon: User, label: 'Profile', description: 'Your personal account settings' },
  { href: '/settings/workspace', icon: Building2, label: 'Workspace', description: 'Workspace name, logo, and timezone' },
  { href: '/settings/team', icon: Users, label: 'Team', description: 'Manage team members and roles' },
  { href: '/settings/integrations', icon: Plug, label: 'Integrations', description: 'WhatsApp, email, and other connections' },
  { href: '/settings/compliance', icon: Shield, label: 'Compliance', description: 'Suppression lists and opt-out management' },
  { href: '/settings/api', icon: Key, label: 'API Access', description: 'API keys and developer access' },
]

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <>
      <div className="main-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="page-content">
        <div style={{ maxWidth: '640px' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Manage your account, workspace, team, and integrations.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {settingsNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  padding: 'var(--space-5)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-xl)', background: 'var(--surface)',
                  textDecoration: 'none', transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-300)'; e.currentTarget.style.background = 'var(--brand-50)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
              >
                <div style={{ width: '44px', height: '44px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                  <item.icon size={22} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{item.label}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.description}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
