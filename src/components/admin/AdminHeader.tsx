import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { LayoutGrid, Users, QrCode, Home, LogOut, Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/admin/users', label: 'Clientes', icon: Users },
  { to: '/admin/scanner', label: 'Escáner', icon: QrCode },
]

export default function AdminHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useStore(s => s.logout)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/admin')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-brand-azul/95 backdrop-blur-md border-b border-white/10">
      <div className="px-4 h-14 flex items-center justify-between">
        <span className="font-heading text-white uppercase">{title}</span>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-3">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = location.pathname === item.to
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-heading px-3 py-1.5 rounded-xl border-2 border-brand-sombra transition-colors',
                  active ? 'bg-brand-rosa text-white' : 'bg-white/10 text-white/85 hover:bg-white/20'
                )}
              >
                <Icon className="w-3.5 h-3.5" />{item.label}
              </button>
            )
          })}
          <Link to="/" aria-label="Ver app pública" className="text-white/75 hover:text-white transition-colors">
            <Home className="w-4 h-4" />
          </Link>
          <button onClick={handleLogout} aria-label="Cerrar sesión" className="text-white/75 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden text-white/90 hover:text-white p-1"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={cn(
        'sm:hidden overflow-hidden transition-all duration-300 bg-brand-azul border-t border-white/10',
        menuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="px-4 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = location.pathname === item.to
            return (
              <button
                key={item.to}
                onClick={() => { setMenuOpen(false); navigate(item.to) }}
                className={cn(
                  'flex items-center gap-2 font-body py-2',
                  active ? 'text-brand-rosa' : 'text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
          <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 text-white/90 font-body py-2">
            <Home className="w-4 h-4" />
            <span>Ver app pública</span>
          </Link>
          <button
            onClick={() => { setMenuOpen(false); handleLogout() }}
            className="flex items-center gap-2 text-brand-rosa font-body py-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  )
}
