import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-1)', fontSize: 14, outline: 'none',
  transition: 'border-color 0.15s',
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '40px' }}>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>📬</span>
            <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', margin: '16px 0 8px' }}>
              Check your inbox
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.6 }}>
              If <strong>{email}</strong> is registered, you'll get a reset link shortly.
            </p>
            <Link to="/login" style={{ display: 'inline-block', marginTop: 24, fontSize: 13, color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 4 }}>
                Forgot password?
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
                Enter your email and we'll send a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Email</label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  marginTop: 4, width: '100%', padding: '12px',
                  borderRadius: 10, background: 'var(--orange)', color: '#fff',
                  fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer',
                  opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              <Link to="/login" style={{ color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>
                ← Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
