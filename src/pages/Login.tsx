import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Paleta from '../components/ui/Paleta'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { User, UserPlus, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react'

type AuthMode = 'login' | 'register'

export default function Login() {
  const navigate = useNavigate()
  const { login, register } = useStore()
  const profile = useStore(s => s.profile)
  const authReady = useStore(s => s.authReady)

  // If already logged in, redirect once the session has resolved
  useEffect(() => {
    if (authReady && profile) navigate('/cuenta', { replace: true })
  }, [authReady, profile, navigate])

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (profile) return null

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

    if (authMode === 'login') {
      const result = await login(username.trim(), password)
      setLoading(false)
      if (!result.success) { setError('Usuario o contraseña incorrectos'); return }
      navigate(result.user.is_admin ? '/admin/dashboard' : '/cuenta', { replace: true })
    } else {
      const result = await register(username.trim(), password)
      setLoading(false)
      if (!result.success) {
        setError(result.reason === 'username_taken'
          ? 'Ese apodo ya está en uso. Elige otro.'
          : 'Error al crear tu cuenta. Intenta de nuevo.')
        return
      }
      navigate('/cuenta', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-crema">
      <Navbar />

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-4 py-8 pt-28">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="flavor-ring">
            <Paleta className="w-12 h-[4.5rem]" />
          </div>
          <div>
            <h1 className="font-heading text-brand-tinta text-3xl">
              {authMode === 'login' ? 'Bienvenido' : 'Únete'}
            </h1>
            <p className="text-brand-tinta/50 text-sm font-body mt-1">
              {authMode === 'login'
                ? 'Ingresa para ver tus puntos y cupones'
                : 'Crea tu cuenta con solo un apodo'}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 p-1 bg-brand-tinta/10 rounded-2xl mb-6">
          <button
            onClick={() => { setAuthMode('login'); setError('') }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-heading uppercase tracking-wide transition-all duration-200',
              authMode === 'login' ? 'bg-brand-tinta text-white shadow' : 'text-brand-tinta/60 hover:text-brand-tinta'
            )}
          >
            <User className="w-4 h-4" /> Iniciar sesión
          </button>
          <button
            onClick={() => { setAuthMode('register'); setError('') }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-heading uppercase tracking-wide transition-all duration-200',
              authMode === 'register' ? 'bg-brand-fresa text-white shadow' : 'text-brand-tinta/60 hover:text-brand-tinta'
            )}
          >
            <UserPlus className="w-4 h-4" /> Crear cuenta
          </button>
        </div>

        {/* Form */}
        <div className="paper-card rounded-3xl p-6 flex flex-col gap-4 animate-slide-up">
          {/* Username */}
          <div>
            <label className="font-heading text-brand-tinta text-xs mb-1.5 block">
              {authMode === 'login' ? 'Tu apodo' : 'Elige tu apodo'}
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
            <label className="font-heading text-brand-tinta text-xs mb-1.5 block">
              Contraseña
              {authMode === 'register' && (
                <span className="text-brand-tinta/40 font-body"> (mín. 8 caracteres)</span>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-tinta/40 hover:text-brand-tinta transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password (register only) */}
          {authMode === 'register' && (
            <>
              <div>
                <label className="font-heading text-brand-tinta text-xs mb-1.5 block">
                  Confirma contraseña
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
                      ? 'bg-brand-fresa border-brand-tinta'
                      : 'border-brand-tinta/30 hover:border-brand-fresa'
                  )}
                >
                  {termsAccepted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className="text-xs text-brand-tinta/70 font-body leading-relaxed">
                  Acepto los{' '}
                  <Link to="/terminos" target="_blank" className="text-brand-fresa font-bold underline">
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
              authMode === 'login' ? 'btn-tinta' : 'btn-fresa',
              'mt-1',
              loading && 'opacity-70 cursor-not-allowed'
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading
              ? 'Verificando...'
              : authMode === 'login'
              ? 'Entrar'
              : 'Crear mi cuenta'
            }
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-brand-tinta/10" />
          <span className="text-xs text-brand-tinta/40 font-body">¿Quieres ganar puntos?</span>
          <div className="flex-1 h-px bg-brand-tinta/10" />
        </div>

        {/* CTA to redeem */}
        <Link
          to="/canjear"
          className="btn-fresa text-center"
        >
          <Zap className="w-4 h-4" />
          Canjear palabra secreta
        </Link>
      </div>

      <Footer />
    </div>
  )
}
