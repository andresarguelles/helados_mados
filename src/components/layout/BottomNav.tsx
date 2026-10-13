import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { esRutaKiosco } from '../../lib/kiosco'
import type { Rol } from '../../lib/roles'
import {
  Home, User, Trophy, Rocket, Ticket,
  LayoutGrid, Users, QrCode, Store, ChartColumn,
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

const INICIO: NavItem = { to: '/', label: 'Inicio', icon: Home }
const DINAMICAS: NavItem = { to: '/admin/dashboard', label: 'Entrenamientos', icon: LayoutGrid }
const CLIENTES: NavItem = { to: '/admin/users', label: 'Clientes', icon: Users }
const ESCANER: NavItem = { to: '/admin/scanner', label: 'Escáner', icon: QrCode }
const ESTACION: NavItem = { to: '/admin/estacion', label: 'Estación', icon: Store }
const METRICAS: NavItem = { to: '/admin/metricas', label: 'Métricas', icon: ChartColumn }

// Una barra por rol (0044). El superadmin cambia Inicio por Métricas: con seis no caben las
// etiquetas en un teléfono, y la home sigue a un toque desde el logo.
const ITEMS_POR_ROL: Record<Rol, NavItem[]> = {
  cliente: MEMBER_ITEMS,
  staff: [INICIO, ESCANER, ESTACION],
  admin: [INICIO, DINAMICAS, CLIENTES, ESCANER, ESTACION],
  superadmin: [DINAMICAS, CLIENTES, ESCANER, ESTACION, METRICAS],
}

// Fuente única de verdad para saber si la barra está en pantalla: las páginas la usan
// para reservar el espacio inferior (pb-24) y no quedar tapadas por ella.
export function useBottomNavVisible() {
  const authReady = useStore(s => s.authReady)
  const profile = useStore(s => s.profile)
  return authReady && !!profile
}

export default function BottomNav() {
  const visible = useBottomNavVisible()
  const rol = useStore(s => s.rol)
  const location = useLocation()

  // En una pantalla de mostrador nadie navega: la barra solo taparía el ranking.
  if (!visible || esRutaKiosco(location.pathname)) return null

  const items = ITEMS_POR_ROL[rol]

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
