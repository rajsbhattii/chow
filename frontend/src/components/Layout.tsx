import { Bookmark, Compass, Home, Moon, Sun, User } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/home', label: 'Home' },
  { to: '/saved', label: 'Saved' },
  { to: '/explore', label: 'Explore' },
  { to: '/profile', label: 'Profile' },
]

const mobileNavItems = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/saved', label: 'Saved', icon: Bookmark },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/profile', label: 'Profile', icon: User },
]

export default function Layout() {
  const { theme, toggle } = useTheme()
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--header-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        <div className="nav-inner" style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLink to="/home" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>🍜</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>Chow</span>
          </NavLink>

          {/* Desktop nav — hidden on mobile */}
          <nav className="desktop-only" style={{ display: 'flex', gap: 4 }}>
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
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
            <button
              className="desktop-only"
              onClick={handleLogout}
              style={{
                padding: '8px 18px',
                borderRadius: 99,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-3)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="mobile-bottom-nav">
        {mobileNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
