import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/saved', label: 'Saved' },
  { to: '/explore', label: 'Explore' },
  { to: '/profile', label: 'Profile' },
]

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e4e4e7',
      }}>
        <div className="nav-inner" style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <span style={{ fontSize: 20 }}>🍜</span>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#09090b', letterSpacing: '-0.03em' }}>Chow</span>
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
                  background: isActive ? '#09090b' : 'transparent',
                  color: isActive ? '#fff' : '#71717a',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <NavLink
            to="/login"
            style={{
              padding: '8px 18px',
              borderRadius: 99,
              background: '#f97316',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign in
          </NavLink>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  )
}
