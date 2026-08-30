import { useEffect, useState } from 'react'
import { useStore } from '../../lib/store'
import { Sparkles, Crown, Medal, Award, Star } from 'lucide-react'
import { cn } from '../../lib/utils'

const PODIUM: { rank: number; title: string; icon: React.ReactNode; badge: string; height: string }[] = [
  { rank: 1, title: 'Comandante', icon: <Crown className="w-5 h-5" />, badge: 'bg-brand-amarillo', height: 'py-5' },
  { rank: 2, title: 'Piloto',     icon: <Medal className="w-4 h-4" />, badge: 'bg-brand-grisclaro', height: 'py-3' },
  { rank: 3, title: 'Cadete',     icon: <Award className="w-4 h-4" />, badge: 'bg-brand-ingravidez', height: 'py-3' },
]

// Orden visual del podio: 2º a la izquierda, 1º al centro (más alto), 3º a la derecha.
const PODIUM_ORDER = [1, 0, 2]

export default function HallOfFame() {
  const getLeaderboard = useStore(s => s.getLeaderboard)
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getLeaderboard>>>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getLeaderboard('all').then(data => {
      if (!cancelled) { setEntries(data.slice(0, 5)); setLoaded(true) }
    })
    return () => { cancelled = true }
  }, [getLeaderboard])

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3, 5)

  return (
    <div className="bg-brand-morado border-4 border-brand-sombra rounded-3xl shadow-sticker-lg p-5 flex flex-col gap-5">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-brand-amarillo" />
          <h2 className="font-heading text-white text-lg">Nuestro Orgullo Helados Mados</h2>
          <Sparkles className="w-4 h-4 text-brand-amarillo" />
        </div>
        <p className="text-white/70 font-body text-xs mt-1">Top 5 histórico</p>
      </div>

      {!loaded ? (
        <div className="flex items-end justify-center gap-3 py-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="relative overflow-hidden w-20 h-24 rounded-2xl bg-white/10">
              <div className="absolute inset-0 shimmer" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-6 text-white/70">
          <Star className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="font-heading text-sm">Sin actividad aún</p>
          <p className="text-xs mt-1 font-body">¡Sé el primero en la historia!</p>
        </div>
      ) : (
        <>
          {/* Podio top 3 */}
          <div className="flex items-end justify-center gap-3">
            {PODIUM_ORDER.map(idx => {
              const entry = top3[idx]
              const podium = PODIUM[idx]
              if (!entry) return null

              return (
                <div key={entry.user.id} className="flex flex-col items-center gap-1.5 w-24">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-brand-sombra border-2 border-brand-sombra shrink-0',
                    podium.badge
                  )}>
                    {podium.icon}
                  </div>
                  <div className={cn(
                    'w-full rounded-2xl bg-white border-2 border-brand-sombra flex flex-col items-center gap-1 px-2',
                    podium.height
                  )}>
                    <p className="font-heading text-brand-azul text-[10px] uppercase tracking-wide">{podium.title}</p>
                    <p className="font-heading text-brand-sombra text-sm truncate w-full text-center">{entry.user.username}</p>
                    <span className="points-chip">{entry.points} pts</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 4º y 5º lugar */}
          {rest.length > 0 && (
            <div className="flex flex-col gap-2">
              {rest.map((entry, i) => (
                <div key={entry.user.id} className="flex items-center gap-3 bg-white/10 rounded-2xl px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-white/15 text-white flex items-center justify-center font-heading text-xs border border-white/20 shrink-0">
                    {i + 4}
                  </div>
                  <p className="flex-1 min-w-0 font-heading text-white text-sm truncate">{entry.user.username}</p>
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
