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

  const top3 = entries.slice(0, 3)
  const rest  = entries.slice(3)

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
        <>
          {/* Podium — Top 3 */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-3 py-4">
              {/* 2nd place */}
              {top3[1] && (
                <PodiumCard entry={top3[1]} rank={1} height="h-20" isMe={top3[1].user.id === currentUserId} />
              )}
              {/* 1st place */}
              <PodiumCard entry={top3[0]} rank={0} height="h-28" isMe={top3[0].user.id === currentUserId} />
              {/* 3rd place */}
              {top3[2] && (
                <PodiumCard entry={top3[2]} rank={2} height="h-16" isMe={top3[2].user.id === currentUserId} />
              )}
            </div>
          )}

          {/* Remaining rows */}
          {rest.length > 0 && (
            <div className="flex flex-col gap-1">
              {rest.map((entry, i) => (
                <div
                  key={entry.user.id}
                  className={cn(
                    'lb-row',
                    entry.user.id === currentUserId && 'bg-brand-azul/10 border border-brand-azul/30'
                  )}
                >
                  <div className="rank-badge text-xs bg-brand-azul/10 text-brand-azul">
                    {i + 4}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-brand-sombra text-sm truncate">
                      {entry.user.username}
                      {entry.user.id === currentUserId && (
                        <span className="text-brand-azul text-xs ml-1 font-body">(Tú)</span>
                      )}
                    </p>
                  </div>
                  <span className="points-chip">{entry.points} pts</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PodiumCard({
  entry, rank, height, isMe,
}: {
  entry: { user: { username: string; id: string }; points: number }
  rank: number
  height: string
  isMe: boolean
}) {
  const blockColors = ['bg-brand-amarillo', 'bg-white', 'bg-brand-ingravidez']

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      {/* Avatar circle */}
      <div className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center',
        'border-2 border-brand-sombra shadow-sticker-sm',
        blockColors[rank],
        rank === 0 && 'w-14 h-14 animate-float'
      )}>
        <Medal className={cn('text-brand-sombra', rank === 0 ? 'w-7 h-7' : 'w-6 h-6')} />
      </div>

      {/* Name + points */}
      <div className="text-center">
        <p className={cn(
          'font-heading text-brand-sombra truncate max-w-[80px]',
          rank === 0 ? 'text-sm' : 'text-xs'
        )}>
          {entry.user.username}
        </p>
        {isMe && <span className="block text-brand-azul text-[10px] font-body">Tú</span>}
        <span className="points-chip mt-0.5">{entry.points}</span>
      </div>

      {/* Podium block */}
      <div className={cn(
        `w-full ${height} rounded-t-2xl border-2 border-brand-sombra flex items-center justify-center`,
        blockColors[rank]
      )}>
        <span className="font-heading text-2xl text-brand-sombra/20">
          {rank + 1}
        </span>
      </div>
    </div>
  )
}
