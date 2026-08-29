import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Coupon, Dynamic } from '../../lib/types'
import { useStore } from '../../lib/store'
import { formatDate, formatCountdown } from '../../lib/utils'
import { cn } from '../../lib/utils'
import { Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Gift } from 'lucide-react'

interface CouponCardProps {
  coupon: Coupon
}

export default function CouponCard({ coupon }: CouponCardProps) {
  const dynamics = useStore(s => s.dynamics)
  const dynamic = dynamics.find(d => d.id === coupon.dynamic_id) as Dynamic | undefined
  const [countdown, setCountdown] = useState('')
  const [expanded, setExpanded] = useState(coupon.status === 'active')

  useEffect(() => {
    if (!dynamic || coupon.status !== 'active') return
    const update = () => setCountdown(formatCountdown(dynamic.ends_at))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [dynamic, coupon.status])

  if (!dynamic) return null

  const statusConfig = {
    active: {
      border: 'border-brand-sombra',
      badge: 'bg-brand-amarillo text-brand-sombra',
      badgeText: 'Activo',
      icon: <Clock className="w-4 h-4 text-brand-azul" />,
    },
    redeemed: {
      border: 'border-brand-sombra',
      badge: 'bg-brand-verde text-brand-sombra',
      badgeText: 'Canjeado',
      icon: <CheckCircle2 className="w-4 h-4 text-brand-sombra" />,
    },
    expired: {
      border: 'border-brand-sombra/15',
      badge: 'bg-brand-sombra/10 text-brand-sombra/50',
      badgeText: 'Expirado',
      icon: <XCircle className="w-4 h-4 text-brand-sombra/30" />,
    },
  }

  const cfg = statusConfig[coupon.status]

  return (
    <div className={cn(
      'bg-white rounded-3xl border-2 overflow-hidden transition-all duration-300',
      cfg.border,
      coupon.status === 'active' ? 'shadow-sticker-sm' : 'shadow-sm',
      coupon.status === 'expired' && 'opacity-60'
    )}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-10 h-10 bg-brand-azul/10 rounded-2xl flex items-center justify-center text-brand-azul shrink-0">
          <Gift className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-brand-sombra text-sm truncate">
            {dynamic.prize_label}
          </p>
          <p className="font-body text-brand-gris text-xs">
            Palabra: <span className="font-bold text-brand-azul">{dynamic.keyword}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn('text-xs font-heading px-2.5 py-0.5 rounded-full', cfg.badge)}>
            {cfg.badgeText}
          </span>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-brand-sombra/30" />
            : <ChevronDown className="w-3.5 h-3.5 text-brand-sombra/30" />
          }
        </div>
      </button>

      {/* Expanded QR section */}
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        expanded ? 'max-h-[500px]' : 'max-h-0'
      )}>
        <div className="px-4 pb-5 flex flex-col items-center gap-4 border-t border-brand-sombra/10 pt-4">
          {coupon.status === 'active' && (
            <>
              {/* Countdown */}
              <div className="flex items-center gap-2 bg-brand-azul/10 rounded-2xl px-4 py-2 w-full justify-center">
                {cfg.icon}
                <span className="font-mono font-bold text-brand-azul text-lg tabular-nums">
                  {countdown}
                </span>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-2xl p-4 border-2 border-brand-sombra shadow-sticker-sm">
                <QRCodeSVG
                  value={coupon.id}
                  size={160}
                  level="H"
                  fgColor="#1C2440"
                  bgColor="#FFFFFF"
                />
              </div>

              <p className="text-xs text-brand-gris text-center font-body">
                Muestra este QR en mostrador para canjear tu medalla
              </p>
              <p className="text-[10px] text-brand-sombra/30 font-mono break-all text-center">
                ID: {coupon.id}
              </p>
            </>
          )}

          {coupon.status === 'redeemed' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <CheckCircle2 className="w-14 h-14 text-brand-sombra" />
              <p className="font-heading text-brand-sombra">¡Medalla entregada!</p>
              <p className="text-xs text-brand-gris font-body">
                Canjeado el {coupon.redeemed_at ? formatDate(coupon.redeemed_at) : '—'}
              </p>
            </div>
          )}

          {coupon.status === 'expired' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <XCircle className="w-14 h-14 text-brand-sombra/20" />
              <p className="font-heading text-brand-sombra/50">Cupón expirado</p>
              <p className="text-xs text-brand-sombra/30 font-body">
                Expiró el {formatDate(dynamic.ends_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
