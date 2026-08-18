import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import CouponCard from '../components/account/CouponCard'
import { useStore } from '../lib/store'
import { Coupon } from '../lib/types'
import { Star, Trophy, Sparkles, ChevronRight } from 'lucide-react'

export default function Account() {
  const navigate = useNavigate()
  const profile = useStore(s => s.profile)
  const authReady = useStore(s => s.authReady)
  const getUserCoupons = useStore(s => s.getUserCoupons)
  const fetchDynamics = useStore(s => s.fetchDynamics)
  const [allCoupons, setAllCoupons] = useState<Coupon[]>([])

  useEffect(() => {
    if (authReady && !profile) navigate('/canjear')
  }, [authReady, profile, navigate])

  useEffect(() => {
    if (profile) {
      getUserCoupons(profile.id).then(setAllCoupons)
      fetchDynamics()
    }
  }, [profile, getUserCoupons, fetchDynamics])

  if (!profile) return null

  const active   = allCoupons.filter(c => c.status === 'active')
  const history  = allCoupons.filter(c => c.status !== 'active')

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navbar />

      {/* Profile header */}
      <div className="bg-hero-pattern pt-20 pb-10 px-4">
        <div className="max-w-lg mx-auto flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-coral to-brand-pink rounded-3xl flex items-center justify-center text-5xl shadow-xl shadow-brand-coral/30">
            🍦
          </div>
          <div>
            <h1 className="font-heading font-black text-white text-2xl">{profile.username}</h1>
            <p className="text-white/50 text-sm font-body">Miembro Helados Mados</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-6 py-3">
            <Star className="w-5 h-5 text-brand-lemon fill-brand-lemon" />
            <span className="font-heading font-black text-brand-lemon text-3xl">{profile.total_points}</span>
            <span className="font-body text-white/60 text-sm">puntos totales</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 max-w-lg mx-auto w-full flex flex-col gap-6">

        {/* Active coupons */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-brand-coral" />
            <h2 className="font-heading font-black text-brand-navy text-lg">Cupones Activos</h2>
            {active.length > 0 && (
              <span className="bg-brand-coral text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                {active.length}
              </span>
            )}
          </div>

          {active.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center">
              <p className="text-4xl mb-2">🎫</p>
              <p className="font-heading font-bold text-brand-navy/60 text-sm">Sin cupones activos</p>
              <p className="text-xs text-brand-navy/40 mt-1">Canjea una palabra secreta del Live</p>
              <button
                onClick={() => navigate('/canjear')}
                className="btn-coral mt-4 text-sm px-6 py-2.5"
              >
                Canjear Ahora
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {active.map(c => <CouponCard key={c.id} coupon={c} />)}
            </div>
          )}
        </section>

        {/* History */}
        {history.length > 0 && (
          <section>
            <h2 className="font-heading font-black text-brand-navy text-lg mb-3">Historial</h2>
            <div className="flex flex-col gap-3">
              {history.map(c => <CouponCard key={c.id} coupon={c} />)}
            </div>
          </section>
        )}

        {/* Coming soon banner */}
        <div className="bg-gradient-to-r from-brand-navy to-brand-navy/80 rounded-3xl p-5 flex items-center gap-4">
          <Sparkles className="w-10 h-10 text-brand-lemon shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="font-heading font-black text-white text-sm">Pronto habrá nuevas cosas</p>
            <p className="font-body text-white/50 text-xs mt-0.5">Avatares, wallet digital y más sorpresas</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
        </div>

      </div>

      <Footer />
    </div>
  )
}
