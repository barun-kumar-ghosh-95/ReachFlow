// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password. Please try again.')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Sign in to your ReachFlow workspace
        </p>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
          background: 'var(--error-50)', border: '1px solid var(--error-100)',
          borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
        }}>
          <AlertCircle size={16} color="var(--error-500)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--error-600)' }}>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="form-group">
          <label htmlFor="login-email" className="form-label required">Email address</label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <label htmlFor="login-password" className="form-label required" style={{ marginBottom: 0 }}>Password</label>
            <Link href="/forgot-password" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          id="login-submit"
          style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: 'var(--space-2)' }}
        >
          {loading ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        Don't have an account?{' '}
        <Link href="/register" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>
          Create one free
        </Link>
      </p>

      {/* Demo credentials hint */}
      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
        <div style={{
          marginTop: 'var(--space-6)', padding: 'var(--space-4)',
          background: 'linear-gradient(135deg, #ede9fe, #f0f4ff)',
          border: '1px solid var(--brand-200)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--brand-700)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demo Credentials</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--brand-600)', fontFamily: 'var(--font-mono)' }}>
            Email: demo@reachflow.app<br />
            Password: demo123456
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
