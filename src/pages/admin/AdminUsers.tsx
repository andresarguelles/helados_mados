import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../lib/store'
import { formatDate } from '../../lib/utils'
import { cn } from '../../lib/utils'
import AdminHeader from '../../components/admin/AdminHeader'
import { Search, ChevronDown, Users2, Gift, QrCode } from 'lucide-react'

type SortKey = 'points' | 'recent'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'points', label: 'Más puntos' },
  { key: 'recent', label: 'Más recientes' },
]

export default function AdminUsers() {
  const { profiles, coupons, fetchAllProfiles, fetchDynamics } = useStore()
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('points')
  const [sortOpen, setSortOpen] = useState(false)

  useEffect(() => {
    Promise.all([fetchAllProfiles(), fetchDynamics()]).then(() => setLoaded(true))
  }, [fetchAllProfiles, fetchDynamics])

  const customers = useMemo(() => {
    const q = query.trim().toLowerCase()
    return profiles
      .filter(p => !p.is_admin)
      .filter(p => !q || p.username.toLowerCase().includes(q))
      .sort((a, b) => sort === 'points'
        ? b.total_points - a.total_points
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }, [profiles, query, sort])

  const getCouponCounts = (userId: string) => {
    const userCoupons = coupons.filter(c => c.user_id === userId)
    return {
      digital: userCoupons.filter(c => c.digital_awarded).length,
      physical: userCoupons.filter(c => c.physical_awarded).length,
    }
  }

  const currentSortLabel = SORT_OPTIONS.find(o => o.key === sort)?.label ?? 'Más puntos'

  return (
    <div className="min-h-screen bg-brand-azul flex flex-col">
      <AdminHeader title="Panel Comandante" />

      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-20 pb-6 flex flex-col gap-6">

        <div>
          <h1 className="font-heading text-white text-xl uppercase">Clientes</h1>
          <p className="text-white/85 text-xs font-body mt-0.5">
            {loaded ? `${customers.length} cliente${customers.length === 1 ? '' : 's'} registrado${customers.length === 1 ? '' : 's'}` : 'Cargando...'}
          </p>
        </div>

        {/* Search + sort */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar por apodo..."
              className="field-input-dark pl-10"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(o => !o)}
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              className="field-input-dark flex items-center justify-between cursor-pointer"
            >
              <span>{currentSortLabel}</span>
              <ChevronDown className={cn('w-4 h-4 text-white/60 transition-transform', sortOpen && 'rotate-180')} />
            </button>

            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                <div
                  role="listbox"
                  className="absolute left-0 right-0 mt-2 z-20 bg-brand-azul border-2 border-white/20 rounded-2xl shadow-sticker-sm overflow-hidden"
                >
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      type="button"
                      role="option"
                      aria-selected={sort === option.key}
                      onClick={() => { setSort(option.key); setSortOpen(false) }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm font-body transition-colors',
                        sort === option.key ? 'bg-white/15 text-white font-bold' : 'text-white/85 hover:bg-white/10'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Customer list */}
        {!loaded ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="relative overflow-hidden bg-white/5 border border-white/10 rounded-3xl h-20">
                <div className="absolute inset-0 shimmer opacity-20" />
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-white/75">
            <Users2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-heading">
              {query ? 'Ningún cliente coincide con tu búsqueda' : 'Sin clientes registrados aún'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {customers.map(customer => {
              const { digital, physical } = getCouponCounts(customer.id)
              return (
                <div key={customer.id} className="bg-white/5 border border-white/10 rounded-3xl p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-white text-sm truncate">{customer.username}</p>
                    <p className="text-white/60 text-xs font-body mt-0.5">Miembro desde {formatDate(customer.created_at)}</p>
                    <div className="flex items-center gap-3 text-xs text-white/75 font-body mt-1.5">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3 text-brand-amarillo/70" />{digital} digitales
                      </span>
                      <span className="flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-brand-amarillo/70" />{physical} físicos
                      </span>
                    </div>
                  </div>
                  <span className="points-chip shrink-0">{customer.total_points} pts</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
