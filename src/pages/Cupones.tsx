import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import { useBottomNavVisible } from '../components/layout/BottomNav'
import CouponCard from '../components/account/CouponCard'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { Coupon } from '../lib/types'
import { Ticket, History } from 'lucide-react'

export default function Cupones() {
  const navigate = useNavigate()
  const profile = useStore(s => s.profile)
  const getUserCoupons = useStore(s => s.getUserCoupons)
  const fetchDynamics = useStore(s => s.fetchDynamics)
  const navVisible = useBottomNavVisible()
  const [allCoupons, setAllCoupons] = useState<Coupon[]>([])
  const [couponsLoaded, setCouponsLoaded] = useState(false)

  // CouponCard necesita la dinámica del cupón desde el store: sin fetchDynamics no renderiza nada.
  useEffect(() => {
    if (profile) {
      getUserCoupons(profile.id).then(coupons => { setAllCoupons(coupons); setCouponsLoaded(true) })
      fetchDynamics()
    }
  }, [profile, getUserCoupons, fetchDynamics])

  if (!profile) return null

  const active = allCoupons.filter(c => c.status === 'active')
  const history = allCoupons.filter(c => c.status !== 'active')

  return (
    <div className={cn('min-h-screen flex flex-col bg-brand-papel', navVisible && 'pb-24')}>
      <Navbar />

      <div className="flex-1 px-4 pt-20 pb-6 max-w-lg mx-auto w-full flex flex-col gap-6">

        <div className="pt-2">
          <h1 className="font-heading text-brand-sombra text-2xl">Mis cupones</h1>
          <p className="font-body text-brand-gris text-sm mt-1">
            Muestra el QR en mostrador para recibir tu medalla.
          </p>
        </div>

        {/* Cupones activos */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-5 h-5 text-brand-azul" />
            <h2 className="font-heading text-brand-sombra text-lg">Cupones activos</h2>
            {active.length > 0 && (
              <span className="bg-brand-azul text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                {active.length}
              </span>
            )}
          </div>

          {!couponsLoaded ? (
            <div className="paper-card rounded-3xl p-8 flex flex-col items-center gap-2">
              <div className="relative overflow-hidden w-32 h-4 rounded-full bg-brand-sombra/10">
                <div className="absolute inset-0 shimmer" />
              </div>
              <div className="relative overflow-hidden w-44 h-3 rounded-full bg-brand-sombra/10">
                <div className="absolute inset-0 shimmer" />
              </div>
            </div>
          ) : active.length === 0 ? (
            <div className="paper-card rounded-3xl p-8 text-center">
              <p className="font-heading text-brand-gris text-sm">Sin cupones activos</p>
              <p className="text-xs text-brand-gris mt-1 font-body">Canjea una palabra secreta del Live</p>
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

        {/* Historial */}
        {history.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <History className="w-5 h-5 text-brand-gris" />
              <h2 className="font-heading text-brand-sombra text-lg">Historial</h2>
            </div>
            <div className="flex flex-col gap-3">
              {history.map(c => <CouponCard key={c.id} coupon={c} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
