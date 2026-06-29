import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 10,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-1)', fontSize: 14, outline: 'none',
  transition: 'border-color 0.15s',
}

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: '#f87171',
}

export default function Signup() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const errs: typeof fieldErrors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email'
    if (password.length < 8) errs.password = 'Must be at least 8 characters'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/auth/register', { name, email, password })
      login(data.access_token, data.refresh_token, data.user)
      navigate('/onboarding', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '40px' }}>

        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-1)', marginBottom: 4 }}>
            Create account
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Let's find you something good.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Name</label>
            <input
              type="text" required value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--orange)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Email</label>
            <input
              type="email" required value={email}
              onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })) }}
              placeholder="you@example.com"
              style={fieldErrors.email ? inputErrorStyle : inputStyle}
              onFocus={e => (e.target.style.borderColor = fieldErrors.email ? '#f87171' : 'var(--orange)')}
              onBlur={e => (e.target.style.borderColor = fieldErrors.email ? '#f87171' : 'var(--border)')}
            />
            {fieldErrors.email && <p style={{ fontSize: 12, color: '#dc2626' }}>{fieldErrors.email}</p>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Password</label>
            <input
              type="password" required value={password}
              onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })) }}
              placeholder="8+ characters"
              style={fieldErrors.password ? inputErrorStyle : inputStyle}
              onFocus={e => (e.target.style.borderColor = fieldErrors.password ? '#f87171' : 'var(--orange)')}
              onBlur={e => (e.target.style.borderColor = fieldErrors.password ? '#f87171' : 'var(--border)')}
            />
            {fieldErrors.password && <p style={{ fontSize: 12, color: '#dc2626' }}>{fieldErrors.password}</p>}
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
            {loading ? 'Creating account…' : 'Continue'}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--orange)', fontWeight: 600, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
