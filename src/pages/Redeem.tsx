import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Paleta from '../components/ui/Paleta'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { QRCodeSVG as QRCode } from 'qrcode.react'
import confetti from 'canvas-confetti'
import { ArrowLeft, Key, User, UserPlus, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

type Step = 'keyword' | 'auth' | 'success'
type AuthMode = 'login' | 'register'

export default function Redeem() {
  const navigate = useNavigate()
  const { getActiveDynamic, login, register, redeemKeyword } = useStore()

  const [step, setStep] = useState<Step>('keyword')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
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

    setLoading(false)
    setStep('auth')
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

    // Attempt redemption
    const trimmedKw = keyword.trim().toUpperCase()
    const result = await redeemKeyword(trimmedKw)
    setLoading(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        invalid: 'La palabra ya no está activa.',
        expired: 'Esta dinámica ha expirado.',
        already_redeemed: '¡Ya canjeaste esta palabra secreta! Solo un canje por dinámica.',
        ip_limit: 'Se alcanzó el límite de canjes desde tu red. Intenta más tarde.',
        not_authenticated: 'Tu sesión expiró. Inicia sesión de nuevo.',
      }
      setError(messages[result.reason] || 'Error inesperado.')
      return
    }

    const dynamic = await getActiveDynamic(trimmedKw)
    setPrizeLabel(dynamic?.prize_label ?? 'Premio')
    setCouponId(result.coupon.id)

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FF3D68', '#FFC83D', '#0FA88F', '#7A3FA0'],
    })

    setStep('success')
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-crema">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 pt-20 pb-8">

        {/* Back button */}
        {step !== 'success' && (
          <button
            onClick={() => step === 'keyword' ? navigate('/') : setStep('keyword')}
            className="flex items-center gap-1.5 text-brand-tinta/50 hover:text-brand-tinta text-sm font-body mt-4 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'keyword' ? 'Inicio' : 'Cambiar palabra'}
          </button>
        )}

        {/* ── Step 1: Keyword ─────────────────────────────── */}
        {step === 'keyword' && (
          <div className="animate-slide-up flex flex-col gap-6">
            <div>
              <h1 className="font-heading text-brand-tinta text-3xl">
                Ingresa la
                <span className="block text-brand-fresa">palabra secreta</span>
              </h1>
              <p className="font-body text-brand-tinta/60 text-sm mt-2">
                La palabra se revela durante el TikTok Live de Helados Mados.
              </p>
            </div>

            <div className="paper-card rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-brand-limon/25 rounded-2xl px-4 py-3 border-2 border-brand-tinta/10">
                <Key className="w-5 h-5 text-brand-fresa shrink-0" />
                <input
                  id="keyword-input"
                  type="text"
                  value={keyword}
                  onChange={e => { setKeyword(e.target.value.toUpperCase()); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleKeyword()}
                  placeholder="Ej. LIMONADA"
                  maxLength={30}
                  className="flex-1 min-w-0 bg-transparent font-heading text-brand-tinta text-xl uppercase placeholder:text-brand-tinta/30 outline-none tracking-widest"
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
              <p className="text-xs text-brand-tinta/40 font-body">
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => { setStep('auth'); setAuthMode('login') }} className="text-brand-fresa font-bold">
                  Inicia sesión primero
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Auth ────────────────────────────────── */}
        {step === 'auth' && (
          <div className="animate-slide-up flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="flex items-center gap-1.5 text-brand-limon font-heading text-xs bg-brand-tinta px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {keyword}
                </span>
              </div>
              <h1 className="font-heading text-brand-tinta text-3xl mt-2">
                {authMode === 'login' ? '¡Bienvenido!' : 'Crea tu cuenta'}
              </h1>
              <p className="font-body text-brand-tinta/60 text-sm mt-1">
                {authMode === 'login'
                  ? 'Inicia sesión para recibir tu punto y cupón.'
                  : 'Solo necesitas un apodo. Sin datos personales.'}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex gap-2 p-1 bg-brand-tinta/10 rounded-2xl">
              <button
                onClick={() => { setAuthMode('login'); setError('') }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-heading uppercase tracking-wide transition-all',
                  authMode === 'login' ? 'bg-brand-tinta text-white shadow' : 'text-brand-tinta/60 hover:text-brand-tinta'
                )}
              >
                <User className="w-4 h-4" />Soy cliente
              </button>
              <button
                onClick={() => { setAuthMode('register'); setError('') }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-heading uppercase tracking-wide transition-all',
                  authMode === 'register' ? 'bg-brand-fresa text-white shadow' : 'text-brand-tinta/60 hover:text-brand-tinta'
                )}
              >
                <UserPlus className="w-4 h-4" />Soy nuevo
              </button>
            </div>

            <div className="paper-card rounded-3xl p-6 flex flex-col gap-4">
              {/* Username */}
              <div>
                <label className="font-heading text-brand-tinta text-xs mb-1.5 block">
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
                <label className="font-heading text-brand-tinta text-xs mb-1.5 block">
                  {authMode === 'login' ? 'Contraseña' : 'Crea contraseña'}
                  {authMode === 'register' && <span className="text-brand-tinta/40 font-body"> (mín. 8 caracteres)</span>}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-tinta/40 hover:text-brand-tinta transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Register extras */}
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="font-heading text-brand-tinta text-xs mb-1.5 block">
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
                          ? 'bg-brand-fresa border-brand-tinta'
                          : 'border-brand-tinta/30 hover:border-brand-fresa'
                      )}
                    >
                      {termsAccepted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-xs text-brand-tinta/70 font-body leading-relaxed">
                      Acepto los{' '}
                      <a href="/terminos" target="_blank" className="text-brand-fresa font-bold underline">
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
                {loading ? 'Procesando...' : authMode === 'login' ? 'Canjear +1 punto' : 'Registrarme y canjear'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Success ─────────────────────────────── */}
        {step === 'success' && (
          <div className="animate-scale-in flex flex-col items-center gap-6 pt-4">
            <div className="text-center">
              <div className="flavor-ring inline-flex mb-3">
                <Paleta className="w-14 h-20 animate-float" />
              </div>
              <h1 className="font-heading text-brand-tinta text-3xl">
                ¡+1 punto!
              </h1>
              <p className="font-body text-brand-tinta/60 text-sm mt-2">
                Tu cupón está listo. Preséntalo en mostrador para recibir tu premio.
              </p>
            </div>

            {/* Prize banner */}
            <div className="w-full bg-brand-limon/25 border-2 border-brand-tinta rounded-3xl px-5 py-4 text-center">
              <p className="font-heading text-brand-tinta text-xl">{prizeLabel}</p>
              <p className="text-xs text-brand-tinta/50 mt-1 font-body">Premio canjeable con este QR</p>
            </div>

            {/* QR Ticket */}
            <div className="qr-card flex flex-col items-center gap-3 w-full">
              <p className="font-heading text-brand-tinta text-sm uppercase tracking-wider">
                Cupón QR
              </p>
              <QRCode
                value={couponId}
                size={200}
                level="H"
                fgColor="#241A12"
                bgColor="#FFFFFF"
              />
              <div className="flex items-center gap-2 bg-brand-limon/30 rounded-xl px-3 py-1.5">
                <Key className="w-3.5 h-3.5 text-brand-fresa" />
                <span className="font-heading text-brand-fresa text-sm tracking-wider">{keyword}</span>
              </div>
              <p className="text-[10px] text-brand-tinta/30 font-mono">{couponId}</p>
            </div>

            {/* Points info */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-brand-tinta/10">
                <span className="font-body text-sm text-brand-tinta/70">Puntos digitales obtenidos</span>
                <span className="points-chip">+1 pt</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-brand-tinta/10">
                <span className="font-body text-sm text-brand-tinta/70">Al canjear en tienda</span>
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

function ErrorAlert({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-fade-in">
      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <p className="text-xs text-red-600 font-body leading-relaxed">{msg}</p>
    </div>
  )
}
