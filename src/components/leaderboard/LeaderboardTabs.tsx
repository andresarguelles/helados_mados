import { useState, useEffect } from 'react'
import { useStore } from '../../lib/store'
import { Trophy, TrendingUp, Clock, Star, Medal } from 'lucide-react'
import { cn } from '../../lib/utils'

type Period = 'day' | 'week' | 'all'

const TABS: { key: Period; label: string; icon: React.ReactNode }[] = [
  { key: 'day',  label: 'Hoy',      icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'week', label: 'Semana',   icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'all',  label: 'Histórico', icon: <Trophy className="w-3.5 h-3.5" /> },
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
  const currentUserId = useStore(s => s.profile?.id ?? null)
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getLeaderboard>>>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    getLeaderboard(active).then(data => { if (!cancelled) { setEntries(data); setLoaded(true) } })
    return () => { cancelled = true }
  }, [active, getLeaderboard])

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-brand-sombra/10 rounded-2xl">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-heading transition-all duration-200',
              active === tab.key
                ? 'bg-brand-sombra text-white shadow-md'
                : 'text-brand-gris hover:text-brand-sombra'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

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
          {entries.map((entry, i) => {
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
    </div>
  )
}
