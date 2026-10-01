import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import GoogleButton from '../components/auth/GoogleButton'
import { useStore } from '../lib/store'
import { savePendingRedeem, readPendingRedeem, clearPendingRedeem } from '../lib/pendingRedeem'
import { ArrowLeft, Key, CheckCircle2, Loader2 } from 'lucide-react'
import ErrorAlert from '../components/ui/ErrorAlert'

// El QR solo se pinta en el paso de éxito, así que separarlo del bundle inicial
// no cuesta nada de UX y sí aligera lo que carga cualquiera que solo va a canjear.
const QRCode = lazy(() =>
  import('qrcode.react').then(mod => ({ default: mod.QRCodeSVG }))
)

// Sin paso de "¿eres cadete o nuevo?": desde el 2026-09-30 solo se entra con Google, y el mismo
// botón sirve para entrar y para crear cuenta.
type Step = 'keyword' | 'auth' | 'success'

/**
 * Lo que se acepta al continuar: canjear crea un cupón, suma un punto y manda un hash de la IP
 * a `ip_redemption_logs`, aunque la cuenta ya existiera.
 *
 * `target="_blank"` aunque sea un `Link`: `keyword` y `step` viven en el estado de React
 * y salir de /canjear los borra. React Router no intercepta un click con target, así que
 * el documento se abre aparte y el canje se queda donde estaba.
 */
function AvisoLegal() {
  return (
    <p className="text-[11px] text-brand-gris font-body leading-relaxed text-center">
      Al continuar aceptas los{' '}
      <Link to="/terminos" target="_blank" rel="noreferrer" className="text-brand-azul font-bold underline">
        Términos y Condiciones
      </Link>{' '}
      y el{' '}
      <Link to="/privacidad" target="_blank" rel="noreferrer" className="text-brand-azul font-bold underline">
        Aviso de Privacidad
      </Link>{' '}
      de Helados Mados.
    </p>
  )
}

export default function Redeem() {
  const navigate = useNavigate()
  const { getActiveDynamic, redeemKeyword } = useStore()
  const profile = useStore(s => s.profile)
  const authReady = useStore(s => s.authReady)

  const [step, setStep] = useState<Step>('keyword')
  const [keyword, setKeyword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [couponId, setCouponId] = useState('')
  const [prizeLabel, setPrizeLabel] = useState('')

  // ─── Redeem a validated keyword for the current session ────
  const attemptRedeem = async (trimmedKw: string) => {
    const result = await redeemKeyword(trimmedKw)
    setLoading(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        invalid: 'La palabra ya no está activa.',
        expired: 'Este entrenamiento ha expirado.',
        already_redeemed: '¡Ya canjeaste esta palabra secreta! Solo un canje por entrenamiento.',
        ip_limit: 'Se alcanzó el límite de canjes desde tu red. Intenta más tarde.',
        not_authenticated: 'Tu sesión expiró. Inicia sesión de nuevo.',
        no_username: 'Primero elige tu apodo para poder canjear.',
      }
      setError(messages[result.reason] || 'Error inesperado.')
      return
    }

    const dynamic = await getActiveDynamic(trimmedKw)
    setPrizeLabel(dynamic?.prize_label ?? 'Medalla')
    setCouponId(result.coupon.id)

    // Import dinámico: nadie necesita el peso de canvas-confetti hasta este instante.
    const { default: confetti } = await import('canvas-confetti')
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#C8FD5F', '#3C5DDC', '#FFD447', '#FF4F8B'],
    })

    setStep('success')
  }

  // ─── Reanudar tras volver de Google ─────────────────────────
  // El redirect de OAuth recarga la página, así que keyword y step se perdieron.
  // pendingRedeem los rescata de sessionStorage y el canje continúa donde se quedó.
  const resumed = useRef(false)

  useEffect(() => {
    if (!authReady || resumed.current) return

    const pending = readPendingRedeem()
    if (!pending) return

    resumed.current = true
    clearPendingRedeem()

    // Volvió sin sesión (canceló en Google): se queda en el paso normal con su palabra a la mano.
    if (!profile) {
      setKeyword(pending.keyword)
      return
    }

    setKeyword(pending.keyword)
    setLoading(true)
    void attemptRedeem(pending.keyword)
    // attemptRedeem y navigate son estables para lo que aquí importa: esto corre una sola vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, profile])

  // ─── Step 1: Validate keyword ──────────────────────────────
  const handleKeyword = async () => {
    setError('')
    const trimmed = keyword.trim().toUpperCase()
    if (!trimmed) { setError('Ingresa la palabra secreta'); return }

    setLoading(true)

    const dynamic = await getActiveDynamic(trimmed)
    if (!dynamic) {
      setError('Palabra incorrecta o vencida. Verifica en el Live.')
      setLoading(false)
      return
    }

    // Already logged in: redeem right away, no need to log in again
    if (profile) {
      await attemptRedeem(trimmed)
      return
    }

    setLoading(false)

    const { default: confetti } = await import('canvas-confetti')
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.4 },
      colors: ['#C8FD5F', '#3C5DDC', '#FFD447', '#FF4F8B'],
    })

    setStep('auth')
  }

  // Última oportunidad de guardar el canje antes de que el navegador se vaya a Google.
  const persistBeforeGoogle = () => {
    savePendingRedeem({ keyword: keyword.trim().toUpperCase() })
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-papel">
      <Navbar />

      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 pt-20 pb-8">

        {/* Back button */}
        {step !== 'success' && (
          <button
            onClick={() => {
              if (step === 'keyword') { navigate('/'); return }
              setStep('keyword')
            }}
            className="flex items-center gap-1.5 text-brand-sombra/70 hover:text-brand-sombra text-sm font-body mt-4 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'keyword' ? 'Inicio' : 'Cambiar palabra'}
          </button>
        )}

        {/* ── Step 1: Keyword ─────────────────────────────── */}
        {step === 'keyword' && (
          <div className="animate-slide-up flex flex-col gap-6">
            <div>
              <h1 className="font-heading text-brand-sombra text-3xl">
                Ingresa la
                <span className="block text-brand-azul">palabra secreta</span>
              </h1>
              <p className="font-body text-brand-sombra/70 text-sm mt-2">
                La palabra se revela durante el TikTok Live de Helados Mados.
              </p>
            </div>

            <div className="paper-card rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-brand-amarillo/25 rounded-2xl px-4 py-3 border-2 border-brand-sombra/10">
                <Key className="w-5 h-5 text-brand-azul shrink-0" />
                <label htmlFor="keyword-input" className="sr-only">
                  Palabra secreta
                </label>
                <input
                  id="keyword-input"
                  type="text"
                  value={keyword}
                  onChange={e => { setKeyword(e.target.value.toUpperCase()); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleKeyword()}
                  placeholder="Ej. LIMONADA"
                  maxLength={30}
                  className="flex-1 min-w-0 bg-transparent font-heading text-brand-sombra text-xl uppercase placeholder:text-brand-sombra/30 outline-none tracking-widest"
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {error && <ErrorAlert msg={error} />}

              <button
                id="keyword-submit"
                onClick={handleKeyword}
                disabled={loading}
                className="btn-fresa"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {loading ? 'Verificando...' : 'Verificar palabra'}
              </button>
            </div>

            <div className="text-center">
              {profile ? (
                <p className="text-xs text-brand-sombra/70 font-body">
                  Canjearás como <span className="font-bold text-brand-azul">{profile.username}</span>
                </p>
              ) : (
                <p className="text-xs text-brand-sombra/70 font-body">
                  ¿Ya tienes cuenta?{' '}
                  <Link to="/login" className="text-brand-azul font-bold">
                    Inicia sesión primero
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Auth ───────────────────────────────── */}
        {step === 'auth' && (
          <div className="animate-slide-up flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-1.5 mb-1 animate-scale-in">
                <span className="flex items-center gap-1.5 text-brand-amarillo font-heading text-xs bg-brand-sombra px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {keyword}
                </span>
              </div>
              <h1 className="font-heading text-brand-sombra text-3xl mt-2">
                ¡Acertaste!
              </h1>
              <p className="font-body text-brand-sombra/70 text-sm mt-1">
                Entra con Google para recibir tu punto. Si no tienes cuenta, se crea al momento.
              </p>
            </div>

            <div className="paper-card rounded-3xl p-6 flex flex-col gap-4">
              <GoogleButton
                next="/canjear"
                onBeforeRedirect={persistBeforeGoogle}
              />
              <p className="text-xs text-brand-gris font-body leading-relaxed text-center">
                Guardamos tu palabra <span className="font-bold text-brand-azul">{keyword}</span>:
                al volver, tu canje sigue solo.
              </p>
              <AvisoLegal />
            </div>
          </div>
        )}

        {/* ── Step 3: Success ─────────────────────────────── */}
        {step === 'success' && (
          <div className="animate-scale-in flex flex-col items-center gap-6 pt-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2.5">
                <img src="/astronauta_mados_nuevo.svg" alt="" width={40} height={50} className="w-10 h-auto" />
                <h1 className="font-heading text-brand-sombra text-3xl">
                  ¡+1 punto!
                </h1>
              </div>
              <p className="font-body text-brand-sombra/70 text-sm mt-2">
                Tu cupón está listo. Preséntalo en mostrador para recibir tu medalla.
              </p>
            </div>

            {/* Prize banner */}
            <div className="w-full bg-brand-amarillo/25 border-2 border-brand-sombra rounded-3xl px-5 py-4 text-center">
              <p className="font-heading text-brand-sombra text-xl">{prizeLabel}</p>
              <p className="text-xs text-brand-sombra/70 mt-1 font-body">Medalla canjeable con este QR</p>
            </div>

            {/* QR Ticket */}
            <div className="qr-card flex flex-col items-center gap-3 w-full">
              <p className="font-heading text-brand-sombra text-sm uppercase tracking-wider">
                Cupón QR
              </p>
              <Suspense
                fallback={<div className="relative overflow-hidden w-[200px] h-[200px] rounded-xl bg-brand-sombra/10"><div className="absolute inset-0 shimmer" /></div>}
              >
                <QRCode
                  value={couponId}
                  size={200}
                  level="H"
                  fgColor="#1C2440"
                  bgColor="#FFFFFF"
                />
              </Suspense>
              <div className="flex items-center gap-2 bg-brand-amarillo/30 rounded-xl px-3 py-1.5">
                <Key className="w-3.5 h-3.5 text-brand-azul" />
                <span className="font-heading text-brand-azul text-sm tracking-wider">{keyword}</span>
              </div>
              <p className="text-[10px] text-brand-sombra/30 font-mono">{couponId}</p>
            </div>

            {/* Points info */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-brand-sombra/10">
                <span className="font-body text-sm text-brand-gris">Puntos digitales obtenidos</span>
                <span className="points-chip">+1 pt</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-brand-sombra/10">
                <span className="font-body text-sm text-brand-gris">Al canjear en tu estación</span>
                <span className="points-chip">+10 pts</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button onClick={() => navigate('/cupones')} className="btn-fresa w-full text-center">
                Ver mis cupones
              </button>
              <button onClick={() => navigate('/')} className="btn-tinta w-full text-center">
                Ir al leaderboard
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
