import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { User, LogOut, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import ConfirmDialog from '../ui/ConfirmDialog'

const AUTH_ROUTES = ['/login', '/canjear']

export default function Navbar() {
  const { getCurrentUser, logout } = useStore()
  const user = getCurrentUser()
  const navigate = useNavigate()
  const location = useLocation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const showAuthCta = !user && !AUTH_ROUTES.includes(location.pathname)

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setConfirmOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-brand-azul/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img src="/mados-logo-full.svg" alt="Helados Mados" className="h-9 w-auto" />
        </Link>

        {/* La navegación con sesión vive en la barra inferior; aquí solo identidad y salida. */}
        {user ? (
          <div className="flex items-center gap-3">
            <Link
              to="/perfil"
              className="flex items-center gap-1.5 text-white/90 hover:text-white font-body text-sm transition-colors min-w-0"
            >
              <User className="w-4 h-4 shrink-0" />
              <span className="font-semibold truncate max-w-[8rem]">{user.username}</span>
            </Link>
            <button
              onClick={() => setConfirmOpen(true)}
              aria-label="Cerrar sesión"
              className="text-white/75 hover:text-brand-rosa transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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
