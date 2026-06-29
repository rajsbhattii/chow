import { Moon, Sun } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/saved', label: 'Saved' },
  { to: '/explore', label: 'Explore' },
  { to: '/profile', label: 'Profile' },
]

export default function Layout() {
  const { theme, toggle } = useTheme()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--header-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        <div className="nav-inner" style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>🍜</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>Chow</span>
          </NavLink>

          <nav style={{ display: 'flex', gap: 4 }}>
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                style={({ isActive }) => ({
                  padding: '6px 16px',
                  borderRadius: 99,
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  background: isActive ? 'var(--pill-active-bg)' : 'transparent',
                  color: isActive ? 'var(--pill-active-color)' : 'var(--text-3)',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-3)', transition: 'all 0.15s',
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <NavLink
              to="/login"
              style={{
                padding: '8px 18px',
                borderRadius: 99,
                background: 'var(--orange)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign in
            </NavLink>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}
