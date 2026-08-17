import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { Html5Qrcode } from 'html5-qrcode'
import { cn } from '../../lib/utils'
import { ArrowLeft, QrCode, CheckCircle2, XCircle, RotateCcw, Star, Gift } from 'lucide-react'

type ScanState = 'scanning' | 'success' | 'error'
type ErrorReason = 'not_found' | 'already_used' | 'expired' | 'stock_empty'

const ERROR_MESSAGES: Record<ErrorReason, { title: string; desc: string }> = {
  not_found: { title: 'QR no encontrado', desc: 'Este código QR no existe en el sistema.' },
  already_used: { title: 'Cupón ya canjeado', desc: 'Este cupón ya fue utilizado anteriormente.' },
  expired: { title: 'Cupón expirado', desc: 'La vigencia de esta dinámica ha terminado.' },
  stock_empty: { title: 'Stock agotado', desc: 'No quedan premios físicos disponibles para esta dinámica.' },
}

export default function AdminScanner() {
  const navigate = useNavigate()
  const { scanCoupon } = useStore()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanState, setScanState] = useState<ScanState>('scanning')
  const [errorReason, setErrorReason] = useState<ErrorReason | null>(null)
  const [successData, setSuccessData] = useState<{ username: string; prizeLabel: string; points: number } | null>(null)
  const [cameraError, setCameraError] = useState<string>('')
  const isProcessing = useRef(false)

  const startScanner = async () => {
    setCameraError('')
    const qr = new Html5Qrcode('qr-reader')
    scannerRef.current = qr

    try {
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras.length) {
        setCameraError('No se encontró ninguna cámara en este dispositivo.')
        return
      }

      // Prefer back camera on mobile
      const cameraId = cameras.find(c => /back|rear|environment/i.test(c.label))?.id ?? cameras[cameras.length - 1].id

      await qr.start(
        cameraId,
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (isProcessing.current) return
          isProcessing.current = true
          handleScan(decodedText)
        },
        () => { /* scan errors are normal while scanning */ }
      )
    } catch (e) {
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
    }
  }

  useEffect(() => {
    startScanner()
    return () => { stopScanner() }
  }, [])

  const handleScan = async (couponId: string) => {
    await stopScanner()
    const result = scanCoupon(couponId)

    if (result.success) {
      setSuccessData({
        username: result.user.username,
        prizeLabel: result.dynamic.prize_label,
        points: result.user.total_points,
      })
      setScanState('success')
    } else {
      setErrorReason(result.reason)
      setScanState('error')
    }
  }

  const handleReset = async () => {
    setScanState('scanning')
    setSuccessData(null)
    setErrorReason(null)
    isProcessing.current = false
    // Small delay before restarting camera
    setTimeout(startScanner, 400)
  }

  return (
    <div className={cn(
      'min-h-screen flex flex-col transition-colors duration-500',
      scanState === 'success' ? 'bg-green-600' :
      scanState === 'error' ? 'bg-red-600' :
      'bg-brand-navy'
    )}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-safe pb-2 pt-8">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-body">Dashboard</span>
        </button>
        <span className="font-heading font-black text-white text-sm">Escáner QR</span>
        <div className="w-20" />
      </div>

      {/* ── Scanning state ────────────────────────────────────────────────── */}
      {scanState === 'scanning' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <QrCode className="w-8 h-8 text-brand-coral" />
            <h1 className="font-heading font-black text-white text-xl">Escanear Cupón</h1>
            <p className="text-white/50 text-sm font-body">Apunta la cámara al QR del cliente</p>
          </div>

          {cameraError ? (
            <div className="bg-red-500/20 border border-red-400/30 rounded-3xl p-6 text-center max-w-sm w-full">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-white font-heading font-bold text-sm">{cameraError}</p>
              <p className="text-white/50 text-xs mt-2 font-body">
                Asegúrate de estar en HTTPS y haber concedido permisos de cámara.
              </p>
            </div>
          ) : (
            <div className="relative w-full max-w-xs">
              {/* Camera view */}
              <div id="qr-reader" className="rounded-3xl overflow-hidden" />

              {/* Corner overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60">
                  {['top-0 left-0 border-t-4 border-l-4', 'top-0 right-0 border-t-4 border-r-4',
                    'bottom-0 left-0 border-b-4 border-l-4', 'bottom-0 right-0 border-b-4 border-r-4'].map((cls, i) => (
                    <div key={i} className={cn('absolute w-8 h-8 border-brand-coral rounded-sm', cls)} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manual test input (dev helper) */}
          <details className="w-full max-w-xs">
            <summary className="text-white/30 text-xs text-center cursor-pointer hover:text-white/60 transition-colors font-body">
              Ingresar ID manual (dev)
            </summary>
            <div className="mt-3 flex gap-2">
              <input
                id="manual-coupon-id"
                type="text"
                placeholder="Pega el UUID del cupón"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-xs font-mono outline-none focus:border-brand-coral transition-colors"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isProcessing.current) {
                    isProcessing.current = true
                    handleScan((e.target as HTMLInputElement).value.trim())
                  }
                }}
              />
            </div>
          </details>
        </div>
      )}

      {/* ── Success state ─────────────────────────────────────────────────── */}
      {scanState === 'success' && successData && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 animate-scale-in">
          <CheckCircle2 className="w-24 h-24 text-white/90 drop-shadow-2xl" strokeWidth={1.5} />

          <div className="text-center">
            <h1 className="font-heading font-black text-white text-5xl mb-2">¡Válido!</h1>
            <p className="text-white/80 font-heading font-bold text-2xl">{successData.username}</p>
          </div>

          <div className="w-full bg-white/20 backdrop-blur rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Gift className="w-6 h-6 text-white/80 shrink-0" />
              <div>
                <p className="text-white/60 text-xs font-body">Premio entregado</p>
                <p className="font-heading font-black text-white text-lg">{successData.prizeLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-white/20 pt-4">
              <Star className="w-6 h-6 text-white/80 fill-white/80 shrink-0" />
              <div>
                <p className="text-white/60 text-xs font-body">Puntos sumados</p>
                <p className="font-heading font-black text-white text-lg">
                  +10 pts → Total: {successData.points}
                </p>
              </div>
            </div>
          </div>

          <button
            id="scanner-reset"
            onClick={handleReset}
            className="flex items-center gap-2 bg-white text-green-700 font-heading font-black px-8 py-4 rounded-3xl text-lg shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Siguiente Cliente
          </button>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {scanState === 'error' && errorReason && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 animate-scale-in">
          <XCircle className="w-24 h-24 text-white/90 drop-shadow-2xl" strokeWidth={1.5} />

          <div className="text-center">
            <h1 className="font-heading font-black text-white text-4xl mb-2">
              {ERROR_MESSAGES[errorReason].title}
            </h1>
            <p className="text-white/70 font-body text-base">
              {ERROR_MESSAGES[errorReason].desc}
            </p>
          </div>

          <button
            id="scanner-error-reset"
            onClick={handleReset}
            className="flex items-center gap-2 bg-white text-red-700 font-heading font-black px-8 py-4 rounded-3xl text-lg shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            Escanear Otro
          </button>
        </div>
      )}
    </div>
  )
}
