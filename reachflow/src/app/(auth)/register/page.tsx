// src/app/(auth)/register/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', workspace: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordStrength = (() => {
    const p = form.password
    if (p.length === 0) return null
    if (p.length < 6) return { level: 'weak', label: 'Too short', color: 'var(--error-500)' }
    if (p.length < 8) return { level: 'fair', label: 'Fair', color: 'var(--warning-500)' }
    if (/[A-Z]/.test(p) && /[0-9]/.test(p) && p.length >= 8) return { level: 'strong', label: 'Strong', color: 'var(--success-500)' }
    return { level: 'good', label: 'Good', color: 'var(--info-500)' }
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)

    try {
      // Register user
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.')
        return
      }

      // Auto sign-in after registration
      const signInResult = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      })

      if (signInResult?.error) {
        router.push('/login')
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
          Create your account
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Free to start. No credit card required.
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
          <label htmlFor="reg-name" className="form-label required">Full name</label>
          <input
            id="reg-name"
            type="text"
            className="form-input"
            placeholder="Sarah Johnson"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoComplete="name"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-email" className="form-label required">Email address</label>
          <input
            id="reg-email"
            type="email"
            className="form-input"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-workspace" className="form-label required">Workspace name</label>
          <input
            id="reg-workspace"
            type="text"
            className="form-input"
            placeholder="My Company"
            value={form.workspace}
            onChange={(e) => setForm({ ...form, workspace: e.target.value })}
            required
          />
          <span className="form-hint">This is your team's shared workspace on ReachFlow.</span>
        </div>

        <div className="form-group">
          <label htmlFor="reg-password" className="form-label required">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="new-password"
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

          {passwordStrength && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-1)' }}>
                {['weak', 'fair', 'good', 'strong'].map((level, i) => {
                  const levels = ['weak', 'fair', 'good', 'strong']
                  const currentIndex = levels.indexOf(passwordStrength.level)
                  return (
                    <div key={level} style={{ flex: 1, height: '3px', borderRadius: '999px', background: i <= currentIndex ? passwordStrength.color : 'var(--border)', transition: 'background 0.2s' }} />
                  )
                })}
              </div>
              <span style={{ fontSize: 'var(--text-xs)', color: passwordStrength.color, fontWeight: '600' }}>
                {passwordStrength.label}
              </span>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          id="register-submit"
          style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: 'var(--space-2)' }}
        >
          {loading ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Creating account...
            </>
          ) : (
            'Create free account'
          )}
        </button>

        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center', lineHeight: '1.6' }}>
          By creating an account you agree to our{' '}
          <Link href="/terms" style={{ color: 'var(--accent)' }}>Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>.
        </p>
      </form>

      <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>
          Sign in
        </Link>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}
