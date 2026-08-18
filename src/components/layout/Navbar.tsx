import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { User, LogOut, Settings, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import Paleta from '../ui/Paleta'

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
    <nav className="fixed top-0 left-0 right-0 z-40 bg-brand-tinta/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5 group">
          <Paleta className="w-5 h-8 group-hover:-rotate-6 transition-transform" />
          <span className="font-heading text-white text-lg leading-none">
            Helados<span className="text-brand-fresa">Mados</span>
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
                  className="text-white/60 hover:text-brand-limon transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-white/60 hover:text-brand-fresa transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm font-heading text-white/80 hover:text-white border border-white/20 hover:border-white/50 px-3 py-1.5 rounded-xl transition-all"
            >
              Iniciar sesión
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
        'sm:hidden overflow-hidden transition-all duration-300 bg-brand-tinta border-t border-white/10',
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
                className="flex items-center gap-2 text-brand-fresa font-body py-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="btn-fresa text-center shadow-sticker-cream hover:shadow-sticker-cream-lg"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
