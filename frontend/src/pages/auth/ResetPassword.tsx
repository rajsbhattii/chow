import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../lib/api'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-1)', fontSize: 14, outline: 'none',
  transition: 'border-color 0.15s',
}

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setDone(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Invalid or expired link. Please request a new one.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ width: '100%', maxWidth: 400, padding: '40px', textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>🔗</span>
          <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '16px 0' }}>This reset link is invalid.</p>
          <Link to="/forgot-password" style={{ color: 'var(--orange)', fontWeight: 600, textDecoration: 'none', fontSize: 13 }}>
            Request a new one →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '40px' }}>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 48 }}>✅</span>
            <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', margin: '16px 0 8px' }}>
              Password updated
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)' }}>You can now sign in with your new password.</p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              style={{
                marginTop: 24, padding: '12px 28px', borderRadius: 10,
                background: 'var(--orange)', color: '#fff', border: 'none',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Sign in →
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 4 }}>
                Set new password
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Choose something strong.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>New password</label>
                <input
                  type="password" required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Confirm password</label>
                <input
                  type="password" required value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
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
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
