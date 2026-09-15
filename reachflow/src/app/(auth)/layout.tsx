// src/app/(auth)/layout.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sign in to ReachFlow',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg)',
    }}>
      {/* Left panel - branding */}
      <div style={{
        flex: '0 0 480px',
        background: 'linear-gradient(135deg, var(--brand-950) 0%, var(--brand-800) 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-12)',
        position: 'relative',
        overflow: 'hidden',
      }} className="auth-panel">
        {/* Background pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 30% 20%, rgba(90,106,240,0.3) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(124,148,255,0.15) 0%, transparent 50%)`,
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)', textDecoration: 'none', zIndex: 1 }}>
          <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <Zap size={22} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: '800', color: 'white', letterSpacing: '-0.04em' }}>ReachFlow</span>
        </Link>

        {/* Tagline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 1 }}>
          <h2 style={{ fontSize: 'var(--text-4xl)', fontWeight: '800', color: 'white', letterSpacing: '-0.04em', lineHeight: '1.1', marginBottom: 'var(--space-4)' }}>
            One place to reach your audience
          </h2>
          <p style={{ fontSize: 'var(--text-lg)', color: 'rgba(255,255,255,0.7)', lineHeight: '1.7' }}>
            WhatsApp and email campaigns, contact management, analytics, and AI — all in one workspace.
          </p>

          {/* Feature bullets */}
          <div style={{ marginTop: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              'Official WhatsApp Business Cloud API',
              'Consent-first. Compliance built-in.',
              'Multi-channel campaigns + analytics',
              'AI-assisted message generation',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.8)' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px' }}>✓</span>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.4)', zIndex: 1 }}>
          © {new Date().getFullYear()} ReachFlow. All rights reserved.
        </p>
      </div>

      {/* Right panel - form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {children}
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .auth-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
