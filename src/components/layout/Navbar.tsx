import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { IceCream2, User, LogOut, Settings, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

export default function Navbar() {
  const { getCurrentUser, logout, isAdmin } = useStore()
  const user = getCurrentUser()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setMenuOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-brand-navy/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-brand-coral rounded-xl flex items-center justify-center shadow-lg shadow-brand-coral/40 group-hover:scale-110 transition-transform">
            <IceCream2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-black text-white text-lg leading-none">
            Helados<span className="text-brand-coral">Mados</span>
          </span>
        </Link>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/cuenta"
                className="flex items-center gap-1.5 text-white/80 hover:text-white font-body text-sm transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="font-semibold">{user.username}</span>
                <span className="points-chip ml-1">{user.total_points} pts</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="text-white/60 hover:text-brand-lemon transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-white/60 hover:text-brand-coral transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm font-heading font-bold text-white/80 hover:text-white border border-white/20 hover:border-white/50 px-3 py-1.5 rounded-xl transition-all"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden text-white/80 hover:text-white p-1"
          onClick={() => setMenuOpen(o => !o)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={cn(
        'sm:hidden overflow-hidden transition-all duration-300 bg-brand-navy border-t border-white/10',
        menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-3">
          {user ? (
            <>
              <Link
                to="/cuenta"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-white/80 font-body py-2"
              >
                <User className="w-4 h-4" />
                <span className="font-semibold">{user.username}</span>
                <span className="points-chip ml-auto">{user.total_points} pts</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 text-white/60 font-body py-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Panel Admin</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-brand-coral font-body py-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar Sesión</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="btn-coral text-center"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
