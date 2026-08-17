import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Coupon, Dynamic } from '../../lib/mock-data'
import { useStore } from '../../lib/store'
import { formatDate, formatCountdown } from '../../lib/utils'
import { cn } from '../../lib/utils'
import { Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

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
      border: 'border-brand-lemon',
      badge: 'bg-brand-lemon text-brand-navy',
      badgeText: '✅ Activo',
      icon: <Clock className="w-4 h-4 text-brand-coral" />,
    },
    redeemed: {
      border: 'border-green-300',
      badge: 'bg-green-100 text-green-700',
      badgeText: '🎉 Canjeado',
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    },
    expired: {
      border: 'border-gray-200',
      badge: 'bg-gray-100 text-gray-500',
      badgeText: '⏰ Expirado',
      icon: <XCircle className="w-4 h-4 text-gray-400" />,
    },
  }

  const cfg = statusConfig[coupon.status]

  return (
    <div className={cn(
      'bg-white rounded-3xl border-2 overflow-hidden shadow-md transition-all duration-300',
      cfg.border,
      coupon.status === 'expired' && 'opacity-60'
    )}>
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-10 h-10 bg-brand-navy/5 rounded-2xl flex items-center justify-center text-2xl">
          🍦
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-black text-brand-navy text-sm truncate">
            {dynamic.prize_label}
          </p>
          <p className="font-body text-brand-navy/50 text-xs">
            Palabra: <span className="font-bold text-brand-coral">{dynamic.keyword}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn('text-xs font-heading font-bold px-2.5 py-0.5 rounded-full', cfg.badge)}>
            {cfg.badgeText}
          </span>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-brand-navy/30" />
            : <ChevronDown className="w-3.5 h-3.5 text-brand-navy/30" />
          }
        </div>
      </button>

      {/* Expanded QR section */}
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        expanded ? 'max-h-[500px]' : 'max-h-0'
      )}>
        <div className="px-4 pb-5 flex flex-col items-center gap-4 border-t border-brand-navy/10 pt-4">
          {coupon.status === 'active' && (
            <>
              {/* Countdown */}
              <div className="flex items-center gap-2 bg-brand-coral/10 rounded-2xl px-4 py-2 w-full justify-center">
                {cfg.icon}
                <span className="font-heading font-black text-brand-coral text-lg tabular-nums">
                  {countdown}
                </span>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-brand-lemon">
                <QRCodeSVG
                  value={coupon.id}
                  size={160}
                  level="H"
                  fgColor="#0F172A"
                  bgColor="#FFFFFF"
                />
              </div>

              <p className="text-xs text-brand-navy/40 text-center font-body">
                Muestra este QR en mostrador para canjear tu premio
              </p>
              <p className="text-[10px] text-brand-navy/30 font-mono break-all text-center">
                ID: {coupon.id}
              </p>
            </>
          )}

          {coupon.status === 'redeemed' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <CheckCircle2 className="w-14 h-14 text-green-400" />
              <p className="font-heading font-bold text-brand-navy">¡Premio entregado!</p>
              <p className="text-xs text-brand-navy/50">
                Canjeado el {coupon.redeemed_at ? formatDate(coupon.redeemed_at) : '—'}
              </p>
            </div>
          )}

          {coupon.status === 'expired' && (
            <div className="flex flex-col items-center gap-2 py-2">
              <XCircle className="w-14 h-14 text-gray-300" />
              <p className="font-heading font-bold text-brand-navy/50">Cupón expirado</p>
              <p className="text-xs text-brand-navy/30">
                Expiró el {formatDate(dynamic.ends_at)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
