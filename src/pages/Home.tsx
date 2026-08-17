import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import LeaderboardTabs from '../components/leaderboard/LeaderboardTabs'
import { useNavigate } from 'react-router-dom'
import { IceCream2, Zap, Gift, Shield } from 'lucide-react'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navbar />

      {/* Hero section with dark navy background */}
      <section className="bg-hero-pattern pt-20 pb-10 px-4">
        <div className="max-w-lg mx-auto flex flex-col items-center text-center gap-6">
          {/* Floating ice cream emoji */}
          <div className="text-8xl animate-float select-none">🍦</div>

          {/* Headline */}
          <div>
            <h1 className="font-heading font-black text-white text-4xl leading-tight">
              Gana premios
              <span className="block text-brand-coral">helados gratis</span>
            </h1>
            <p className="text-white/60 font-body mt-3 text-sm leading-relaxed">
              Únete al TikTok Live, ingresa la palabra secreta
              y canjea tu premio en tienda. ¡Compite por el top!
            </p>
          </div>

          {/* CTA Button */}
          <button
            id="cta-redeem"
            onClick={() => navigate('/canjear')}
            className="btn-coral text-lg px-10 py-4 flex items-center gap-3"
          >
            <Zap className="w-5 h-5" />
            Canjear Palabra Secreta
          </button>

          {/* Trust pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { icon: '🎯', text: 'Sin datos personales' },
              { icon: '⚡', text: 'Puntos al instante' },
              { icon: '🏆', text: 'Compite en el ranking' },
            ].map(pill => (
              <span key={pill.text} className="bg-white/10 text-white/70 text-xs font-body px-3 py-1.5 rounded-full flex items-center gap-1">
                {pill.icon} {pill.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard section */}
      <section className="flex-1 px-4 py-6 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-heading font-black text-brand-navy text-xl">🏆 Tabla de Líderes</h2>
        </div>
        <div className="glass-card rounded-3xl p-4">
          <LeaderboardTabs />
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pb-8 max-w-lg mx-auto w-full">
        <h2 className="font-heading font-black text-brand-navy text-xl mb-4">¿Cómo funciona?</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: <IceCream2 className="w-6 h-6" />, title: 'Mira el Live', desc: 'Conéctate a nuestro TikTok Live y espera la palabra secreta del día.' },
            { icon: <Zap className="w-6 h-6" />, title: 'Ingresa la palabra', desc: 'Regístrate con tu apodo y canjea la palabra para obtener +1 punto digital.' },
            { icon: <Gift className="w-6 h-6" />, title: 'Canjea en tienda', desc: 'Presenta tu QR en mostrador y recibe tu helado. ¡Suma +10 puntos!' },
            { icon: <Shield className="w-6 h-6" />, title: 'Privacidad total', desc: 'Solo usamos tu apodo. Sin correos ni datos personales.' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 glass-card rounded-2xl p-4">
              <div className="w-10 h-10 bg-brand-coral/10 rounded-xl flex items-center justify-center text-brand-coral shrink-0">
                {step.icon}
              </div>
              <div>
                <p className="font-heading font-bold text-brand-navy text-sm">{step.title}</p>
                <p className="font-body text-brand-navy/60 text-xs mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  )
}
