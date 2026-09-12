import Navbar from '../components/layout/Navbar'
import { useBottomNavVisible } from '../components/layout/BottomNav'
import HallOfFame from '../components/leaderboard/HallOfFame'
import LeaderboardTabs from '../components/leaderboard/LeaderboardTabs'
import { cn } from '../lib/utils'
import { Trophy } from 'lucide-react'

export default function Ranking() {
  const navVisible = useBottomNavVisible()

  return (
    <div className={cn('min-h-screen flex flex-col bg-brand-papel', navVisible && 'pb-24')}>
      <Navbar />

      <div className="flex-1 px-4 pt-20 pb-6 max-w-lg mx-auto w-full flex flex-col gap-6">

        <div className="pt-2">
          <h1 className="font-heading text-brand-sombra text-2xl">Ranking</h1>
          <p className="font-body text-brand-gris text-sm mt-1">
            Compite por el primer lugar de la tripulación.
          </p>
        </div>

        <HallOfFame />

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-brand-azul" />
            <h2 className="font-heading text-brand-sombra text-xl">Tabla de líderes</h2>
          </div>
          <div className="paper-card rounded-3xl p-4">
            <LeaderboardTabs />
          </div>
        </div>
      </div>
    </div>
  )
}
