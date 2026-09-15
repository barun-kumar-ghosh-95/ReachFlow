'use client'

// src/components/landing/Footer.tsx
import Link from 'next/link'
import { Zap } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security', href: '/security' },
    { label: 'API Docs', href: '/docs/api' },
    { label: 'Changelog', href: '/changelog' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Careers', href: '/careers' },
    { label: 'Contact', href: '/contact' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Acceptable Use', href: '/acceptable-use' },
    { label: 'Cookie Policy', href: '/cookies' },
    { label: 'Compliance', href: '/settings/compliance' },
  ],
  Support: [
    { label: 'Help Center', href: '/help' },
    { label: 'WhatsApp Setup', href: '/docs/whatsapp' },
    { label: 'Email Setup', href: '/docs/email' },
    { label: 'Status Page', href: '/status' },
  ],
}

export function Footer() {
  return (
    <footer style={{
      background: 'var(--gray-900)',
      color: 'var(--gray-400)',
      padding: 'var(--space-16) var(--space-8) var(--space-8)',
      borderTop: '1px solid var(--gray-800)',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        {/* Top */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(4, auto)', gap: 'var(--space-12)', marginBottom: 'var(--space-12)', flexWrap: 'wrap' }}>
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', textDecoration: 'none' }}>
              <div style={{ width: '32px', height: '32px', background: 'var(--gradient-brand)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={18} color="white" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.04em' }}>ReachFlow</span>
            </Link>
            <p style={{ fontSize: 'var(--text-sm)', lineHeight: '1.7', maxWidth: '280px', marginBottom: 'var(--space-4)' }}>
              Create, personalize, schedule and analyze WhatsApp and email campaigns from one powerful workspace.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.2)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600' }}>
                ✓ WhatsApp Business
              </span>
              <span style={{ background: 'rgba(90,106,240,0.15)', color: 'var(--brand-400)', border: '1px solid rgba(90,106,240,0.2)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600' }}>
                ✓ GDPR Compliant
              </span>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 style={{ color: '#ffffff', fontSize: 'var(--text-xs)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
                {category}
              </h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-400)', textDecoration: 'none', transition: 'color var(--transition-fast)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gray-400)')}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid var(--gray-800)', paddingTop: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <p style={{ fontSize: 'var(--text-sm)' }}>
            © {new Date().getFullYear()} ReachFlow. All rights reserved.
          </p>
          <p style={{ fontSize: 'var(--text-xs)' }}>
            Uses official Meta WhatsApp Business Cloud API. Not affiliated with Meta or WhatsApp.
          </p>
        </div>
      </div>
    </footer>
  )
}
