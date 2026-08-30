import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { QRCodeSVG as QRCode } from 'qrcode.react'
import confetti from 'canvas-confetti'
import { ArrowLeft, Key, User, UserPlus, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'
import ErrorAlert from '../components/ui/ErrorAlert'

type Step = 'keyword' | 'choice' | 'auth' | 'success'
type AuthMode = 'login' | 'register'

export default function Redeem() {
  const navigate = useNavigate()
  const { getActiveDynamic, login, register, redeemKeyword } = useStore()
  const profile = useStore(s => s.profile)

  const [step, setStep] = useState<Step>('keyword')
  const [authMode, setAuthMode] = useState<AuthMode>('register')
  const [skipRedeem, setSkipRedeem] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
      }
      setError(messages[result.reason] || 'Error inesperado.')
      return
    }

    const dynamic = await getActiveDynamic(trimmedKw)
    setPrizeLabel(dynamic?.prize_label ?? 'Medalla')
    setCouponId(result.coupon.id)

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#C8FD5F', '#3C5DDC', '#FFD447', '#FF4F8B'],
    })

    setStep('success')
  }

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
    setSkipRedeem(false)

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.4 },
      colors: ['#C8FD5F', '#3C5DDC', '#FFD447', '#FF4F8B'],
    })

    setStep('choice')
  }

  // ─── Step 2: Auth + Redeem ──────────────────────────────────
  const handleAuth = async () => {
    setError('')

    if (authMode === 'register') {
      if (!username.trim()) { setError('Elige un apodo'); return }
      if (username.trim().length < 3) { setError('El apodo debe tener al menos 3 caracteres'); return }
      if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
      if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return }
      if (!termsAccepted) { setError('Debes aceptar los términos y condiciones'); return }
    } else {
      if (!username.trim() || !password) { setError('Completa todos los campos'); return }
    }

    setLoading(true)

    if (authMode === 'login') {
      const result = await login(username.trim(), password)
      if (!result.success) {
        setError('Usuario o contraseña incorrectos')
        setLoading(false)
        return
      }
    } else {
      const result = await register(username.trim(), password)
      if (!result.success) {
        setError(result.reason === 'username_taken'
          ? 'Ese apodo ya está en uso. Elige otro.'
          : 'Error al crear tu cuenta. Intenta de nuevo.')
        setLoading(false)
        return
      }
    }

    if (skipRedeem) {
      setLoading(false)
      navigate('/cuenta', { replace: true })
      return
    }

    await attemptRedeem(keyword.trim().toUpperCase())
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-papel">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 pt-20 pb-8">

        {/* Back button */}
        {step !== 'success' && (
          <button
            onClick={() => {
              if (step === 'keyword') { navigate('/'); return }
              if (step === 'choice') { setStep('keyword'); return }
              setStep(skipRedeem ? 'keyword' : 'choice')
            }}
            className="flex items-center gap-1.5 text-brand-gris hover:text-brand-sombra text-sm font-body mt-4 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'keyword' ? 'Inicio' : step === 'choice' ? 'Cambiar palabra' : skipRedeem ? 'Atrás' : 'Cambiar opción'}
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
              <p className="font-body text-brand-gris text-sm mt-2">
                La palabra se revela durante el TikTok Live de Helados Mados.
              </p>
            </div>

            <div className="paper-card rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-brand-amarillo/25 rounded-2xl px-4 py-3 border-2 border-brand-sombra/10">
                <Key className="w-5 h-5 text-brand-azul shrink-0" />
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
                <p className="text-xs text-brand-gris font-body">
                  Canjearás como <span className="font-bold text-brand-azul">{profile.username}</span>
                </p>
              ) : (
                <p className="text-xs text-brand-gris font-body">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    onClick={() => { setKeyword(''); setError(''); setSkipRedeem(true); setAuthMode('login'); setStep('auth') }}
                    className="text-brand-azul font-bold"
                  >
                    Inicia sesión primero
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Choice ──────────────────────────────── */}
        {step === 'choice' && (
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
              <p className="font-body text-brand-gris text-sm mt-1">
                Ahora solo inicia sesión. ¡Estás cerca de tu punto!
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setAuthMode('login')}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-3xl border-2 text-left transition-all',
                  authMode === 'login'
                    ? 'border-brand-sombra bg-brand-sombra/5 shadow-card'
                    : 'border-brand-sombra/10 hover:border-brand-sombra/30'
                )}
              >
                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
                  authMode === 'login' ? 'bg-brand-sombra text-white' : 'bg-brand-sombra/10 text-brand-sombra'
                )}>
                  <User className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-heading text-brand-sombra text-sm uppercase tracking-wide">Soy cadete</p>
                  <p className="font-body text-brand-gris text-xs mt-0.5">Ya tengo apodo y contraseña</p>
                </div>
                {authMode === 'login' && <CheckCircle2 className="w-5 h-5 text-brand-sombra shrink-0" />}
              </button>

              <button
                onClick={() => setAuthMode('register')}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-3xl border-2 text-left transition-all',
                  authMode === 'register'
                    ? 'border-brand-azul bg-brand-azul/5 shadow-card'
                    : 'border-brand-sombra/10 hover:border-brand-sombra/30'
                )}
              >
                <div className={cn(
                  'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0',
                  authMode === 'register' ? 'bg-brand-azul text-white' : 'bg-brand-sombra/10 text-brand-sombra'
                )}>
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-heading text-brand-sombra text-sm uppercase tracking-wide">Soy nuevo cadete</p>
                  <p className="font-body text-brand-gris text-xs mt-0.5">Es mi primera vez</p>
                </div>
                {authMode === 'register' && <CheckCircle2 className="w-5 h-5 text-brand-azul shrink-0" />}
              </button>
            </div>

            <button onClick={() => setStep('auth')} className="btn-fresa">
              Siguiente
            </button>
          </div>
        )}

        {/* ── Step 3: Auth ───────────────────────────────── */}
        {step === 'auth' && (
          <div className="animate-slide-up flex flex-col gap-6">
            <div>
              <h1 className="font-heading text-brand-sombra text-3xl">
                {authMode === 'login' ? '¡Bienvenido!' : 'Crea tu cuenta'}
              </h1>
              <p className="font-body text-brand-gris text-sm mt-1">
                {skipRedeem
                  ? (authMode === 'login' ? 'Ingresa para ver tus puntos y cupones.' : 'Crea tu cuenta con solo un apodo.')
                  : (authMode === 'login'
                    ? 'Inicia sesión para recibir tu punto y tu cupón de medalla.'
                    : 'Solo necesitas un apodo.')}
              </p>
            </div>

            <div className="paper-card rounded-3xl p-6 flex flex-col gap-4">
              {/* Username */}
              <div>
                <label className="font-heading text-brand-sombra text-xs mb-1.5 block">
                  {authMode === 'login' ? 'Tu apodo' : 'Crea tu apodo'}
                </label>
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError('') }}
                  placeholder="Ej. IceKingXL"
                  maxLength={20}
                  className="field-input"
                  autoComplete="username"
                />
              </div>

              {/* Password */}
              <div>
                <label className="font-heading text-brand-sombra text-xs mb-1.5 block">
                  {authMode === 'login' ? 'Contraseña' : 'Crea contraseña'}
                  {authMode === 'register' && <span className="text-brand-gris font-body"> (mín. 8 caracteres)</span>}
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="••••••••"
                    className="field-input pr-10"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gris hover:text-brand-sombra transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Register extras */}
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="font-heading text-brand-sombra text-xs mb-1.5 block">
                      Confirma contraseña
                    </label>
                    <input
                      id="confirm-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                      placeholder="••••••••"
                      className="field-input"
                      autoComplete="new-password"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <div
                      onClick={() => setTermsAccepted(t => !t)}
                      className={cn(
                        'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                        termsAccepted
                          ? 'bg-brand-azul border-brand-sombra'
                          : 'border-brand-sombra/30 hover:border-brand-azul'
                      )}
                    >
                      {termsAccepted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-xs text-brand-gris font-body leading-relaxed">
                      Acepto los{' '}
                      <a href="/terminos" target="_blank" className="text-brand-azul font-bold underline">
                        Términos y Condiciones
                      </a>{' '}
                      de Helados Mados.
                    </span>
                  </label>
                </>
              )}

              {error && <ErrorAlert msg={error} />}

              <button
                id="auth-submit"
                onClick={handleAuth}
                disabled={loading}
                className={cn(
                  authMode === 'login' ? 'btn-tinta' : 'btn-fresa',
                  loading && 'opacity-70 cursor-not-allowed'
                )}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading
                  ? 'Procesando...'
                  : skipRedeem
                  ? (authMode === 'login' ? 'Entrar' : 'Crear mi cuenta')
                  : (authMode === 'login' ? 'Canjear +1 punto' : 'Registrarme y canjear')}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ─────────────────────────────── */}
        {step === 'success' && (
          <div className="animate-scale-in flex flex-col items-center gap-6 pt-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2.5">
                <img src="/astronauta_mados_nuevo.svg" alt="" className="w-10 h-auto" />
                <h1 className="font-heading text-brand-sombra text-3xl">
                  ¡+1 punto!
                </h1>
              </div>
              <p className="font-body text-brand-gris text-sm mt-2">
                Tu cupón está listo. Preséntalo en mostrador para recibir tu medalla.
              </p>
            </div>

            {/* Prize banner */}
            <div className="w-full bg-brand-amarillo/25 border-2 border-brand-sombra rounded-3xl px-5 py-4 text-center">
              <p className="font-heading text-brand-sombra text-xl">{prizeLabel}</p>
              <p className="text-xs text-brand-gris mt-1 font-body">Medalla canjeable con este QR</p>
            </div>

            {/* QR Ticket */}
            <div className="qr-card flex flex-col items-center gap-3 w-full">
              <p className="font-heading text-brand-sombra text-sm uppercase tracking-wider">
                Cupón QR
              </p>
              <QRCode
                value={couponId}
                size={200}
                level="H"
                fgColor="#1C2440"
                bgColor="#FFFFFF"
              />
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
              <button onClick={() => navigate('/cuenta')} className="btn-fresa w-full text-center">
                Ver mis cupones
              </button>
              <button onClick={() => navigate('/')} className="btn-tinta w-full text-center">
                Ir al leaderboard
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
