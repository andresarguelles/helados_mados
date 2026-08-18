import { useState, useEffect } from 'react'
import { useStore } from '../../lib/store'
import { getRankEmoji, getRankColors } from '../../lib/utils'
import { Trophy, TrendingUp, Clock, Star } from 'lucide-react'
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

  useEffect(() => {
    let cancelled = false
    getLeaderboard(active).then(data => { if (!cancelled) setEntries(data) })
    return () => { cancelled = true }
  }, [active, getLeaderboard])

  const top3 = entries.slice(0, 3)
  const rest  = entries.slice(3)

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-brand-navy/10 rounded-2xl">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-heading font-bold transition-all duration-200',
              active === tab.key
                ? 'bg-brand-navy text-white shadow-md'
                : 'text-brand-navy/60 hover:text-brand-navy'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-10 text-brand-navy/40">
          <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-heading font-bold text-sm">Sin actividad aún</p>
          <p className="text-xs mt-1">¡Sé el primero en el tablero!</p>
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
                    entry.user.id === currentUserId && 'bg-brand-coral/10 border border-brand-coral/30'
                  )}
                >
                  <div className={cn('rank-badge text-xs', getRankColors(i + 3))}>
                    {i + 4}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-brand-navy text-sm truncate">
                      {entry.user.username}
                      {entry.user.id === currentUserId && (
                        <span className="text-brand-coral text-xs ml-1">(Tú)</span>
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
  const podiumColors = [
    'from-yellow-400 to-yellow-500',
    'from-gray-300 to-gray-400',
    'from-amber-600 to-amber-700',
  ]
  const bgColors = [
    'bg-yellow-50 border-yellow-300',
    'bg-gray-50 border-gray-200',
    'bg-amber-50 border-amber-300',
  ]

  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      {/* Avatar circle */}
      <div className={cn(
        'w-12 h-12 rounded-2xl flex items-center justify-center font-heading font-black text-xl shadow-lg',
        `bg-gradient-to-b ${podiumColors[rank]}`,
        rank === 0 && 'w-14 h-14 text-2xl animate-float'
      )}>
        {getRankEmoji(rank)}
      </div>

      {/* Name + points */}
      <div className="text-center">
        <p className={cn(
          'font-heading font-black text-brand-navy truncate max-w-[80px]',
          rank === 0 ? 'text-sm' : 'text-xs'
        )}>
          {entry.user.username}
          {isMe && <span className="block text-brand-coral text-[10px]">Tú</span>}
        </p>
        <span className="points-chip mt-0.5">{entry.points}</span>
      </div>

      {/* Podium block */}
      <div className={cn(
        `w-full ${height} rounded-t-2xl border-2 bg-gradient-to-b flex items-center justify-center`,
        bgColors[rank]
      )}>
        <span className="font-heading font-black text-2xl opacity-20">
          {rank + 1}
        </span>
      </div>
    </div>
  )
}
