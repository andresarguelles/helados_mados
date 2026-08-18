import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import CouponCard from '../components/account/CouponCard'
import Paleta from '../components/ui/Paleta'
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
    <div className="min-h-screen flex flex-col bg-brand-crema">
      <Navbar />

      {/* Profile header */}
      <div className="bg-brand-tinta pt-24 pb-12 px-4">
        <div className="max-w-lg mx-auto flex flex-col items-center text-center gap-4">
          <div className="flavor-ring">
            <Paleta className="w-12 h-[4.5rem]" />
          </div>
          <div>
            <h1 className="font-heading text-white text-2xl">{profile.username}</h1>
            <p className="text-white/50 text-sm font-body">Miembro Helados Mados</p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-6 py-3">
            <Star className="w-5 h-5 text-brand-limon fill-brand-limon" />
            <span className="font-heading text-brand-limon text-3xl">{profile.total_points}</span>
            <span className="font-body text-white/60 text-sm">puntos totales</span>
          </div>
        </div>

        <div className="scallop-divider mt-10 -mb-12" />
      </div>

      <div className="flex-1 px-4 pt-6 pb-6 max-w-lg mx-auto w-full flex flex-col gap-6">

        {/* Active coupons */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-brand-fresa" />
            <h2 className="font-heading text-brand-tinta text-lg">Cupones activos</h2>
            {active.length > 0 && (
              <span className="bg-brand-fresa text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                {active.length}
              </span>
            )}
          </div>

          {active.length === 0 ? (
            <div className="paper-card rounded-3xl p-8 text-center">
              <p className="font-heading text-brand-tinta/60 text-sm">Sin cupones activos</p>
              <p className="text-xs text-brand-tinta/40 mt-1 font-body">Canjea una palabra secreta del Live</p>
              <button
                onClick={() => navigate('/canjear')}
                className="btn-fresa mt-4 text-xs px-6 py-2.5"
              >
                Canjear ahora
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
            <h2 className="font-heading text-brand-tinta text-lg mb-3">Historial</h2>
            <div className="flex flex-col gap-3">
              {history.map(c => <CouponCard key={c.id} coupon={c} />)}
            </div>
          </section>
        )}

        {/* Coming soon banner */}
        <div className="bg-brand-mora rounded-3xl p-5 flex items-center gap-4 border-2 border-brand-tinta">
          <Sparkles className="w-9 h-9 text-brand-limon shrink-0" />
          <div className="flex-1">
            <p className="font-heading text-white text-sm">Pronto habrá nuevas cosas</p>
            <p className="font-body text-white/60 text-xs mt-0.5">Avatares, wallet digital y más sorpresas</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
        </div>

      </div>

      <Footer />
    </div>
  )
}
