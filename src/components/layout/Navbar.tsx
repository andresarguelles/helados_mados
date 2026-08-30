import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { User, LogOut, Settings, Menu, X, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import ConfirmDialog from '../ui/ConfirmDialog'

const AUTH_ROUTES = ['/login', '/canjear']

export default function Navbar() {
  const { getCurrentUser, logout, isAdmin } = useStore()
  const user = getCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const showAuthCta = !user && !AUTH_ROUTES.includes(location.pathname)

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setMenuOpen(false)
    setConfirmOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-brand-azul/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src="/mados-logo-full.svg" alt="Helados Mados" className="h-9 w-auto" />
        </Link>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/cuenta"
                className="flex items-center gap-1.5 text-white/90 hover:text-white font-body text-sm transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="font-semibold">{user.username}</span>
                <span className="points-chip ml-1">{user.total_points} pts</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  aria-label="Panel Comandante"
                  className="text-white/75 hover:text-brand-verde transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={() => setConfirmOpen(true)}
                aria-label="Cerrar sesión"
                className="text-white/75 hover:text-brand-rosa transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : showAuthCta ? (
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm font-bold text-white/90 hover:text-brand-verde transition-colors"
            >
              Iniciar sesión
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : null}
        </div>

        {/* Mobile menu toggle */}
        {(user || showAuthCta) && (
          <button
            className="sm:hidden text-white/90 hover:text-white p-1"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Mobile menu */}
      <div className={cn(
        'sm:hidden overflow-hidden transition-all duration-300 bg-brand-azul border-t border-white/10',
        menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="max-w-lg mx-auto px-4 py-4 flex flex-col gap-3">
          {user ? (
            <>
              <Link
                to="/cuenta"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-white/90 font-body py-2"
              >
                <User className="w-4 h-4" />
                <span className="font-semibold">{user.username}</span>
                <span className="points-chip ml-auto">{user.total_points} pts</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 text-white/80 font-body py-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Panel Comandante</span>
                </Link>
              )}
              <button
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-2 text-brand-rosa font-body py-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </>
          ) : showAuthCta ? (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="btn-fresa text-center shadow-sticker-white hover:shadow-sticker-lg"
            >
              Iniciar sesión
            </Link>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        icon={<LogOut className="w-5 h-5 text-brand-rosa" />}
        title="¿Cerrar sesión?"
        description="Vas a salir de tu cuenta. Puedes volver a iniciar sesión cuando quieras."
        confirmLabel="Cerrar sesión"
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </nav>
  )
}
