import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) =>
    location.pathname === path
      ? 'text-emerald-400 font-semibold'
      : 'text-slate-300 hover:text-white transition-colors'

  return (
    <nav className="bg-slate-900 shadow-lg">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 font-bold text-emerald-400 text-lg shrink-0">
            ⚽ Porra 2026
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className={`text-sm ${isActive('/')}`}>Inicio</Link>
            <Link to="/matches" className={`text-sm ${isActive('/matches')}`}>Partidos</Link>
            <Link to="/leaderboard" className={`text-sm ${isActive('/leaderboard')}`}>Clasificación</Link>
            {profile?.is_admin && (
              <Link to="/admin" className={`text-sm ${isActive('/admin')}`}>Admin</Link>
            )}
          </div>

          {/* Auth section */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/profile" className="text-sm text-slate-300 hover:text-white transition-colors">
                  👤 {profile?.username}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-3 space-y-2 border-t border-slate-700 pt-3">
            {[
              { to: '/', label: 'Inicio' },
              { to: '/matches', label: 'Partidos' },
              { to: '/leaderboard', label: 'Clasificación' },
              ...(profile?.is_admin ? [{ to: '/admin', label: 'Admin' }] : []),
              ...(user ? [{ to: '/profile', label: `👤 ${profile?.username}` }] : []),
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="block text-sm text-slate-300 hover:text-white py-1"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => { handleSignOut(); setMenuOpen(false) }}
                className="block text-sm text-slate-400 hover:text-red-400 py-1"
              >
                Cerrar sesión
              </button>
            ) : (
              <Link
                to="/register"
                className="block text-sm text-emerald-400 py-1"
                onClick={() => setMenuOpen(false)}
              >
                Registrarse
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
