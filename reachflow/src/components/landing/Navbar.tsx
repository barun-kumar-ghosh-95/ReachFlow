// src/components/landing/Navbar.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Zap } from 'lucide-react'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="nav">
      <div className="nav-inner">
        {/* Logo */}
        <Link href="/" className="nav-logo">
          <div className="nav-logo-mark">
            <Zap size={20} color="white" strokeWidth={2.5} />
          </div>
          <span className="nav-logo-text">ReachFlow</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/features" className="nav-link">Features</Link>
          <Link href="/pricing" className="nav-link">Pricing</Link>
          <Link href="/security" className="nav-link">Security</Link>
          <Link href="/about" className="nav-link">About</Link>
          <Link href="/docs/api" className="nav-link">Docs</Link>
        </nav>

        {/* Actions */}
        <div className="nav-actions">
          <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
          <Link href="/register" className="btn btn-primary btn-sm">Get started free</Link>

          {/* Mobile hamburger */}
          <button
            className="btn btn-ghost btn-icon"
            style={{ display: 'none' }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
        }}>
          <Link href="/features" className="nav-link" onClick={() => setMobileOpen(false)}>Features</Link>
          <Link href="/pricing" className="nav-link" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link href="/security" className="nav-link" onClick={() => setMobileOpen(false)}>Security</Link>
          <Link href="/about" className="nav-link" onClick={() => setMobileOpen(false)}>About</Link>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-3)' }}>
            <Link href="/login" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>Sign in</Link>
            <Link href="/register" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Get started</Link>
          </div>
        </div>
      )}
    </header>
  )
}
