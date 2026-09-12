import { useState, useEffect } from 'react'
import { useStore } from '../../lib/store'
import { Star, Medal } from 'lucide-react'
import { cn, formatDateRange } from '../../lib/utils'

type Period = 'day' | 'week' | 'month' | 'all'

const TABS: { key: Period; label: string }[] = [
  { key: 'day',   label: 'Hoy' },
  { key: 'week',  label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'all',   label: 'Histórico' },
]

// Fondo y medalla por lugar — oro/plata/bronce; del 4º lugar en adelante se usa el badge azul estándar.
const MEDAL_STYLES: Record<number, { row: string; badge: string }> = {
  1: { row: 'bg-brand-amarillo/20', badge: 'bg-brand-amarillo text-brand-sombra' },
  2: { row: 'bg-brand-grisclaro/50', badge: 'bg-brand-grisclaro text-brand-sombra' },
  3: { row: 'bg-brand-ingravidez/20', badge: 'bg-brand-ingravidez text-brand-sombra' },
}

export default function LeaderboardTabs() {
  const [active, setActive] = useState<Period>('all')
  const getLeaderboard = useStore(s => s.getLeaderboard)
  const getLeaderboardRange = useStore(s => s.getLeaderboardRange)
  const currentUserId = useStore(s => s.profile?.id ?? null)
  const isAdmin = useStore(s => s.isAdmin)
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getLeaderboard>>>([])
  const [loaded, setLoaded] = useState(false)
  const [range, setRange] = useState<Awaited<ReturnType<typeof getLeaderboardRange>>>(null)

  const myIndex = entries.findIndex(e => e.user.id === currentUserId)
  const myEntry = myIndex >= 0 ? { rank: myIndex + 1, points: entries[myIndex].points } : null

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    getLeaderboard(active).then(data => { if (!cancelled) { setEntries(data); setLoaded(true) } })

    if (active === 'all') {
      setRange(null)
    } else {
      getLeaderboardRange(active).then(data => { if (!cancelled) setRange(data) })
    }

    return () => { cancelled = true }
  }, [active, getLeaderboard, getLeaderboardRange])

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex items-center justify-between gap-1 p-1 bg-brand-sombra/10 rounded-2xl overflow-hidden">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              'min-w-0 flex items-center justify-center py-2 px-2 rounded-xl text-xs font-heading whitespace-nowrap transition-all duration-200',
              active === tab.key
                ? 'bg-brand-sombra text-white shadow-md'
                : 'text-brand-gris hover:text-brand-sombra'
            )}
          >
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-brand-gris font-body -mt-2.5">
        {active === 'all' ? 'Todo el tiempo' : range ? formatDateRange(range.start, range.end) : ' '}
      </p>

      {!loaded ? (
        <div className="flex flex-col items-center gap-2 py-10">
          <div className="relative overflow-hidden w-40 h-4 rounded-full bg-brand-sombra/10">
            <div className="absolute inset-0 shimmer" />
          </div>
          <div className="relative overflow-hidden w-28 h-3 rounded-full bg-brand-sombra/10">
            <div className="absolute inset-0 shimmer" />
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 text-brand-gris">
          <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-heading text-sm">Sin actividad aún</p>
          <p className="text-xs mt-1 font-body">¡Sé el primero en el tablero!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.slice(0, 30).map((entry, i) => {
            const rank = i + 1
            const medal = MEDAL_STYLES[rank]
            const isMe = entry.user.id === currentUserId

            return (
              <div
                key={entry.user.id}
                className={cn(
                  'lb-row',
                  medal ? medal.row : isMe && 'bg-brand-azul/10 border border-brand-azul/30',
                  medal && isMe && 'ring-2 ring-brand-azul'
                )}
              >
                <div className={cn('rank-badge text-xs', medal ? medal.badge : 'bg-brand-azul/10 text-brand-azul')}>
                  {medal ? <Medal className="w-3.5 h-3.5" /> : rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-brand-sombra text-sm truncate">
                    {entry.user.username}
                    {isMe && <span className="text-brand-azul text-xs ml-1 font-body">(Tú)</span>}
                  </p>
                </div>
                <span className="points-chip">{entry.points} pts</span>
              </div>
            )
          })}
        </div>
      )}

      {currentUserId && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-30 border-t-4 border-brand-azul bg-brand-sombra shadow-sticker">
            <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
              {myEntry ? (
                <>
                  <div className="rank-badge text-xs bg-brand-verde text-brand-sombra border-brand-verde shrink-0">
                    {myEntry.rank}
                  </div>
                  <p className="flex-1 min-w-0 font-heading text-white text-sm truncate">
                    Tu posición
                  </p>
                  <span className="points-chip">{myEntry.points} pts</span>
                </>
              ) : (
                <p className="flex-1 font-body text-white/70 text-xs text-center">
                  {isAdmin
                    ? 'Los administradores no participan en el ranking'
                    : 'Aún no sumas puntos en este período'}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
