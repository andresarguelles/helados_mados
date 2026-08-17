import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { User, UserPlus, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, IceCream2 } from 'lucide-react'

type AuthMode = 'login' | 'register'

export default function Login() {
  const navigate = useNavigate()
  const { login, register, getCurrentUser } = useStore()

  // If already logged in, redirect immediately
  const currentUser = getCurrentUser()
  if (currentUser) {
    navigate('/cuenta', { replace: true })
    return null
  }

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
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
    await new Promise(r => setTimeout(r, 600))

    if (authMode === 'login') {
      const user = login(username.trim(), password)
      setLoading(false)
      if (!user) { setError('Usuario o contraseña incorrectos'); return }
      navigate(user.is_admin ? '/admin/dashboard' : '/cuenta', { replace: true })
    } else {
      const result = register(username.trim(), password)
      setLoading(false)
      if (result === 'username_taken') { setError('Ese apodo ya está en uso. Elige otro.'); return }
      if (result === 'error') { setError('Error al crear tu cuenta. Intenta de nuevo.'); return }
      navigate('/cuenta', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <Navbar />

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-16 h-16 bg-brand-coral rounded-3xl flex items-center justify-center shadow-xl shadow-brand-coral/30 text-3xl">
            🍦
          </div>
          <div>
            <h1 className="font-heading font-black text-brand-navy text-3xl">
              {authMode === 'login' ? 'Bienvenido' : 'Únete'}
            </h1>
            <p className="text-brand-navy/50 text-sm font-body mt-1">
              {authMode === 'login'
                ? 'Ingresa para ver tus puntos y cupones'
                : 'Crea tu cuenta con solo un apodo'}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 p-1 bg-brand-navy/10 rounded-2xl mb-6">
          <button
            onClick={() => { setAuthMode('login'); setError('') }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-heading font-bold transition-all duration-200',
              authMode === 'login' ? 'bg-brand-navy text-white shadow' : 'text-brand-navy/60 hover:text-brand-navy'
            )}
          >
            <User className="w-4 h-4" /> Iniciar Sesión
          </button>
          <button
            onClick={() => { setAuthMode('register'); setError('') }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-heading font-bold transition-all duration-200',
              authMode === 'register' ? 'bg-brand-coral text-white shadow' : 'text-brand-navy/60 hover:text-brand-navy'
            )}
          >
            <UserPlus className="w-4 h-4" /> Crear Cuenta
          </button>
        </div>

        {/* Form */}
        <div className="glass-card rounded-3xl p-6 flex flex-col gap-4 animate-slide-up">
          {/* Username */}
          <div>
            <label className="font-heading font-bold text-brand-navy text-xs mb-1.5 block">
              {authMode === 'login' ? 'Tu Apodo' : 'Elige tu Apodo'}
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError('') }}
              placeholder="Ej. IceKingXL"
              maxLength={20}
              className="field-input"
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* Password */}
          <div>
            <label className="font-heading font-bold text-brand-navy text-xs mb-1.5 block">
              Contraseña
              {authMode === 'register' && (
                <span className="text-brand-navy/40 font-normal"> (mín. 8 caracteres)</span>
              )}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
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

          {/* Confirm password (register only) */}
          {authMode === 'register' && (
            <>
              <div>
                <label className="font-heading font-bold text-brand-navy text-xs mb-1.5 block">
                  Confirma Contraseña
                </label>
                <input
                  id="login-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                  placeholder="••••••••"
                  className="field-input"
                  autoComplete="new-password"
                />
              </div>

              {/* T&C */}
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
                  <Link to="/terminos" target="_blank" className="text-brand-coral font-bold underline">
                    Términos y Condiciones
                  </Link>{' '}
                  de Helados Mados.
                </span>
              </label>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 font-body leading-relaxed">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            onClick={handleSubmit}
            disabled={loading}
            className={cn(
              'flex items-center justify-center gap-2 font-heading font-bold rounded-2xl px-6 py-3 shadow-lg transition-all mt-1',
              authMode === 'login' ? 'btn-navy' : 'btn-coral',
              loading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? 'Verificando...'
              : authMode === 'login'
              ? 'Entrar'
              : '🚀 Crear mi Cuenta'
            }
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-brand-navy/10" />
          <span className="text-xs text-brand-navy/40 font-body">¿Quieres ganar puntos?</span>
          <div className="flex-1 h-px bg-brand-navy/10" />
        </div>

        {/* CTA to redeem */}
        <Link
          to="/canjear"
          className="btn-coral flex items-center justify-center gap-2 text-center"
        >
          <IceCream2 className="w-4 h-4" />
          Canjear Palabra Secreta
        </Link>
      </div>

      <Footer />
    </div>
  )
}
