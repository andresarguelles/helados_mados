import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { useStore } from '../lib/store'
import { getMockIp } from '../lib/utils'
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

  // ─── Step 1: Validate keyword ──────────────────────────────────────────────
  const handleKeyword = async () => {
    setError('')
    const trimmed = keyword.trim().toUpperCase()
    if (!trimmed) { setError('Ingresa la palabra secreta'); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 600)) // simulate network

    const dynamic = getActiveDynamic(trimmed)
    if (!dynamic) {
      setError('Palabra incorrecta o vencida. Verifica en el Live.')
      setLoading(false)
      return
    }

    setLoading(false)
    setStep('auth')
  }

  // ─── Step 2: Auth + Redeem ─────────────────────────────────────────────────
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
    await new Promise(r => setTimeout(r, 700))

    let userId: string

    if (authMode === 'login') {
      const user = login(username.trim(), password)
      if (!user) {
        setError('Usuario o contraseña incorrectos')
        setLoading(false)
        return
      }
      userId = user.id
    } else {
      const result = register(username.trim(), password)
      if (result === 'username_taken') {
        setError('Ese apodo ya está en uso. Elige otro.')
        setLoading(false)
        return
      }
      if (result === 'error') {
        setError('Error al crear tu cuenta. Intenta de nuevo.')
        setLoading(false)
        return
      }
      userId = (result as { id: string }).id
    }

    // Attempt redemption
    const trimmedKw = keyword.trim().toUpperCase()
    const result = redeemKeyword(trimmedKw, userId, getMockIp())
    setLoading(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        invalid: 'La palabra ya no está activa.',
        expired: 'Esta dinámica ha expirado.',
        already_redeemed: '¡Ya canjeaste esta palabra secreta! Solo un canje por dinámica.',
        ip_limit: 'Se alcanzó el límite de canjes desde tu red. Intenta más tarde.',
      }
      setError(messages[result.reason] || 'Error inesperado.')
      return
    }

    const dynamic = getActiveDynamic(trimmedKw)
    setPrizeLabel(dynamic?.prize_label ?? '🍦 Premio')
    setCouponId(result.coupon.id)

    // Confetti 🎉
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#0F172A'],
    })

    setStep('success')
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navbar />

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 pt-20 pb-8">

        {/* Back button */}
        {step !== 'success' && (
          <button
            onClick={() => step === 'keyword' ? navigate('/') : setStep('keyword')}
            className="flex items-center gap-1.5 text-brand-navy/50 hover:text-brand-navy text-sm font-body mt-4 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 'keyword' ? 'Inicio' : 'Cambiar palabra'}
          </button>
        )}

        {/* ── Step 1: Keyword ──────────────────────────────────────────────── */}
        {step === 'keyword' && (
          <div className="animate-slide-up flex flex-col gap-6">
            <div>
              <h1 className="font-heading font-black text-brand-navy text-3xl">
                Ingresa la
                <span className="block text-brand-coral">Palabra Secreta</span>
              </h1>
              <p className="font-body text-brand-navy/60 text-sm mt-2">
                La palabra se revela durante el TikTok Live de Helados Mados.
              </p>
            </div>

            <div className="glass-card rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 bg-brand-lemon/20 rounded-2xl px-4 py-3">
                <Key className="w-5 h-5 text-brand-coral shrink-0" />
                <input
                  id="keyword-input"
                  type="text"
                  value={keyword}
                  onChange={e => { setKeyword(e.target.value.toUpperCase()); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleKeyword()}
                  placeholder="Ej. LIMONADA"
                  maxLength={30}
                  className="flex-1 bg-transparent font-heading font-black text-brand-navy text-xl uppercase placeholder:text-brand-navy/30 outline-none tracking-widest"
                  autoFocus
                  autoComplete="off"
                />
              </div>

              {error && <ErrorAlert msg={error} />}

              <button
                id="keyword-submit"
                onClick={handleKeyword}
                disabled={loading}
                className="btn-coral flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                {loading ? 'Verificando...' : 'Verificar Palabra'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-brand-navy/40 font-body">
                ¿Ya tienes cuenta?{' '}
                <button onClick={() => { setStep('auth'); setAuthMode('login') }} className="text-brand-coral font-bold">
                  Inicia sesión primero
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Auth ─────────────────────────────────────────────────── */}
        {step === 'auth' && (
          <div className="animate-slide-up flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-brand-lemon font-heading font-black text-sm bg-brand-navy px-3 py-1 rounded-full">
                  ✅ {keyword}
                </span>
              </div>
              <h1 className="font-heading font-black text-brand-navy text-3xl mt-2">
                {authMode === 'login' ? '¡Bienvenido!' : 'Crea tu cuenta'}
              </h1>
              <p className="font-body text-brand-navy/60 text-sm mt-1">
                {authMode === 'login'
                  ? 'Inicia sesión para recibir tu punto y cupón.'
                  : 'Solo necesitas un apodo. Sin datos personales.'}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex gap-2 p-1 bg-brand-navy/10 rounded-2xl">
              <button
                onClick={() => { setAuthMode('login'); setError('') }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-heading font-bold transition-all',
                  authMode === 'login' ? 'bg-brand-navy text-white shadow' : 'text-brand-navy/60 hover:text-brand-navy'
                )}
              >
                <User className="w-4 h-4" />Soy Cliente
              </button>
              <button
                onClick={() => { setAuthMode('register'); setError('') }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-heading font-bold transition-all',
                  authMode === 'register' ? 'bg-brand-coral text-white shadow' : 'text-brand-navy/60 hover:text-brand-navy'
                )}
              >
                <UserPlus className="w-4 h-4" />Soy Nuevo
              </button>
            </div>

            <div className="glass-card rounded-3xl p-6 flex flex-col gap-4">
              {/* Username */}
              <div>
                <label className="font-heading font-bold text-brand-navy text-xs mb-1.5 block">
                  {authMode === 'login' ? 'Tu Apodo' : 'Crea tu Apodo'}
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
                <label className="font-heading font-bold text-brand-navy text-xs mb-1.5 block">
                  {authMode === 'login' ? 'Contraseña' : 'Crea Contraseña'}
                  {authMode === 'register' && <span className="text-brand-navy/40 font-normal"> (mín. 8 caracteres)</span>}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy/40 hover:text-brand-navy transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Register extras */}
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="font-heading font-bold text-brand-navy text-xs mb-1.5 block">
                      Confirma Contraseña
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
                          ? 'bg-brand-coral border-brand-coral'
                          : 'border-brand-navy/30 hover:border-brand-coral'
                      )}
                    >
                      {termsAccepted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-xs text-brand-navy/70 font-body leading-relaxed">
                      Acepto los{' '}
                      <a href="/terminos" target="_blank" className="text-brand-coral font-bold underline">
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
                  'flex items-center justify-center gap-2 font-heading font-bold rounded-2xl px-6 py-3 shadow-lg transition-all',
                  authMode === 'login' ? 'btn-navy' : 'btn-coral',
                  loading && 'opacity-70 cursor-not-allowed'
                )}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Procesando...' : authMode === 'login' ? '🎯 Canjear +1 Punto' : '🚀 Registrarme y Canjear'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Success ───────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="animate-scale-in flex flex-col items-center gap-6 pt-4">
            <div className="text-center">
              <div className="text-7xl mb-3 animate-float">🎉</div>
              <h1 className="font-heading font-black text-brand-navy text-3xl">
                ¡+1 Punto!
              </h1>
              <p className="font-body text-brand-navy/60 text-sm mt-2">
                Tu cupón está listo. Preséntalo en mostrador para recibir tu premio.
              </p>
            </div>

            {/* Prize banner */}
            <div className="w-full bg-brand-lemon/30 border-2 border-brand-lemon rounded-3xl px-5 py-4 text-center">
              <p className="font-heading font-black text-brand-navy text-xl">{prizeLabel}</p>
              <p className="text-xs text-brand-navy/50 mt-1 font-body">Premio canjeables con este QR</p>
            </div>

            {/* QR Card */}
            <div className="qr-card flex flex-col items-center gap-3 w-full">
              <p className="font-heading font-black text-brand-navy text-sm uppercase tracking-wider">
                Cupón QR
              </p>
              <QRCode
                value={couponId}
                size={200}
                level="H"
                fgColor="#0F172A"
                bgColor="#FFFFFF"
              />
              <div className="flex items-center gap-2 bg-brand-lemon/30 rounded-xl px-3 py-1.5">
                <Key className="w-3.5 h-3.5 text-brand-coral" />
                <span className="font-heading font-black text-brand-coral text-sm tracking-wider">{keyword}</span>
              </div>
              <p className="text-[10px] text-brand-navy/30 font-mono">{couponId}</p>
            </div>

            {/* Points info */}
            <div className="w-full flex flex-col gap-2">
              <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm">
                <span className="font-body text-sm text-brand-navy/70">Puntos digitales obtenidos</span>
                <span className="points-chip">+1 pt</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm">
                <span className="font-body text-sm text-brand-navy/70">Al canjear en tienda</span>
                <span className="points-chip">+10 pts</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button onClick={() => navigate('/cuenta')} className="btn-coral w-full text-center">
                Ver mis Cupones
              </button>
              <button onClick={() => navigate('/')} className="btn-navy w-full text-center">
                Ir al Leaderboard
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
