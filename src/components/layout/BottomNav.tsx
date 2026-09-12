import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import {
  Home, User, Trophy, Rocket, Ticket,
  LayoutGrid, Users, QrCode,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const MEMBER_ITEMS: NavItem[] = [
  { to: '/',         label: 'Inicio',   icon: Home },
  { to: '/perfil',   label: 'Perfil',   icon: User },
  { to: '/ranking',  label: 'Ranking',  icon: Trophy },
  { to: '/misiones', label: 'Misiones', icon: Rocket },
  { to: '/cupones',  label: 'Cupones',  icon: Ticket },
]

const ADMIN_ITEMS: NavItem[] = [
  { to: '/',                label: 'Inicio',         icon: Home },
  { to: '/admin/dashboard', label: 'Entrenamientos', icon: LayoutGrid },
  { to: '/admin/users',     label: 'Clientes',       icon: Users },
  { to: '/admin/scanner',   label: 'Escáner',        icon: QrCode },
]

// Fuente única de verdad para saber si la barra está en pantalla: las páginas la usan
// para reservar el espacio inferior (pb-24) y no quedar tapadas por ella.
export function useBottomNavVisible() {
  const authReady = useStore(s => s.authReady)
  const profile = useStore(s => s.profile)
  return authReady && !!profile
}

export default function BottomNav() {
  const visible = useBottomNavVisible()
  const isAdmin = useStore(s => s.isAdmin)
  const location = useLocation()

  if (!visible) return null

  const items = isAdmin ? ADMIN_ITEMS : MEMBER_ITEMS

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t-4 border-brand-azul bg-brand-sombra pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto flex items-stretch">
        {items.map(item => {
          const Icon = item.icon
          const active = location.pathname === item.to

          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex-1 min-w-0 flex flex-col items-center gap-1 px-1 py-2.5 transition-colors',
                active ? 'text-brand-verde' : 'text-white/60 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="font-body font-bold text-[10px] leading-none truncate max-w-full">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
