import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import GoogleButton from '../../components/GoogleButton'
import { useAuth } from '../../context/AuthContext'

export default function Welcome() {
  const { isAuthenticated, user } = useAuth()
  const [error, setError] = useState('')

  if (isAuthenticated) {
    return <Navigate to={user?.status === 'onboarding' ? '/onboarding' : '/home'} replace />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '48px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, marginBottom: 20 }}>
          🍜
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)', marginBottom: 8 }}>Chow</h1>
        <p style={{ fontSize: 15, color: 'var(--text-3)', marginBottom: 36, lineHeight: 1.5 }}>
          Swipe your way to your next favourite meal.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          <Link
            to="/signup"
            style={{
              display: 'block', width: '100%', padding: '13px',
              borderRadius: 12, background: 'var(--orange)', color: '#fff',
              fontWeight: 700, fontSize: 14, textDecoration: 'none', textAlign: 'center',
            }}
          >
            Create account
          </Link>

          <Link
            to="/login"
            style={{
              display: 'block', width: '100%', padding: '13px',
              borderRadius: 12, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text-1)',
              fontWeight: 600, fontSize: 14, textDecoration: 'none', textAlign: 'center',
            }}
          >
            Sign in
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-4)', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <GoogleButton onError={setError} />

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', textAlign: 'left' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
