import Navbar from '../components/layout/Navbar'
import { useBottomNavVisible } from '../components/layout/BottomNav'
import { cn } from '../lib/utils'
import { Rocket, Sparkles, ChevronRight } from 'lucide-react'

export default function Misiones() {
  const navVisible = useBottomNavVisible()

  return (
    <div className={cn('min-h-screen flex flex-col bg-brand-papel', navVisible && 'pb-24')}>
      <Navbar />

      <div className="flex-1 px-4 pt-20 pb-6 max-w-lg mx-auto w-full flex flex-col gap-6">

        <div className="pt-2">
          <h1 className="font-heading text-brand-sombra text-2xl">Misiones</h1>
          <p className="font-body text-brand-gris text-sm mt-1">
            Retos para sumar puntos extra en tus despegues.
          </p>
        </div>

        {/* Próximamente */}
        <div className="bg-brand-morado rounded-3xl p-5 flex items-center gap-4 border-2 border-brand-sombra">
          <Sparkles className="w-9 h-9 text-brand-verde shrink-0" />
          <div className="flex-1">
            <p className="font-heading text-white text-sm">Pronto habrá nuevas cosas</p>
            <p className="font-body text-white/85 text-xs mt-0.5">Avatares, wallet digital y más sorpresas</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
        </div>

        <div className="paper-card rounded-3xl p-8 text-center flex flex-col items-center gap-2">
          <Rocket className="w-10 h-10 text-brand-azul/30" />
          <p className="font-heading text-brand-gris text-sm">Aún no hay misiones disponibles</p>
          <p className="text-xs text-brand-gris font-body max-w-xs">
            Estamos preparando el primer set de misiones. Mientras tanto, sigue el Live
            y canjea la palabra secreta.
          </p>
        </div>
      </div>
    </div>
  )
}
