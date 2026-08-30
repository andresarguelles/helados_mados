import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import LeaderboardTabs from '../components/leaderboard/LeaderboardTabs'
import { useNavigate } from 'react-router-dom'
import { Zap, Gift, Trophy, Sparkles, Rocket } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-brand-papel">
      <Navbar />

      {/* Hero — la nave nodriza */}
      <section className="bg-brand-azul bg-dots-azul pt-24 pb-12 px-4">
        <div className="max-w-lg mx-auto flex flex-col items-center text-center gap-6">
          {/* Headline */}
          <div>
            <h1 className="font-heading text-white text-4xl leading-tight">
              Gana medallas
              <span className="block text-brand-verde">despega por un helado</span>
            </h1>
            <p className="text-white/90 font-body mt-3 text-sm leading-relaxed max-w-xs mx-auto">
              Únete al TikTok Live, ingresa la palabra secreta
              y canjea tu medalla en tu estación. ¡Compite por ser Comandante!
            </p>
          </div>

          {/* CTA Button */}
          <button
            id="cta-redeem"
            onClick={() => navigate('/canjear')}
            className="btn-fresa text-base px-10 py-4 shadow-sticker-white hover:shadow-sticker-lg"
          >
            <Zap className="w-4 h-4" />
            Canjear palabra secreta
          </button>

          {/* Trust pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { icon: <Rocket className="w-3.5 h-3.5" />, text: 'Sé parte de la tripulación' },
              { icon: <Zap className="w-3.5 h-3.5" />, text: 'Puntos al instante' },
              { icon: <Trophy className="w-3.5 h-3.5" />, text: 'Compite en el ranking' },
            ].map((pill, i) => (
              <span
                key={pill.text}
                className={i % 2 === 0 ? 'badge-tilt' : 'badge-tilt badge-tilt-alt'}
              >
                {pill.icon} {pill.text}
              </span>
            ))}
          </div>
        </div>

        {/* Drip edge into the leaderboard section below */}
        <div className="scallop-divider mt-10 -mb-12" />
      </section>

      {/* Leaderboard section */}
      <section className="flex-1 px-4 pt-6 pb-6 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-brand-azul" />
          <h2 className="font-heading text-brand-sombra text-xl">Tabla de líderes</h2>
        </div>
        <div className="paper-card rounded-3xl p-4">
          <LeaderboardTabs />
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-8 max-w-lg mx-auto w-full">
        <h2 className="font-heading text-brand-sombra text-xl mb-4">¿Cómo funciona?</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: <Sparkles className="w-5 h-5" />, title: 'Mira el Live', desc: 'Conéctate a nuestro TikTok Live y espera la palabra secreta del día.' },
            { icon: <Zap className="w-5 h-5" />, title: 'Ingresa la palabra', desc: 'Regístrate con tu apodo y canjea la palabra para obtener +1 punto digital.' },
            { icon: <Gift className="w-5 h-5" />, title: 'Canjea en tu estación', desc: 'Presenta tu QR en mostrador y recibe tu medalla. ¡Suma +10 puntos!' },
            { icon: <Trophy className="w-5 h-5" />, title: 'Compite y gana', desc: 'Sube en la tabla de líderes y compite por el primer lugar.' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 paper-card rounded-2xl p-4">
              <div className="w-10 h-10 bg-brand-azul/10 rounded-xl flex items-center justify-center text-brand-azul shrink-0">
                {step.icon}
              </div>
              <div>
                <p className="font-heading text-brand-sombra text-sm uppercase">{step.title}</p>
                <p className="font-body text-brand-gris text-xs mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
