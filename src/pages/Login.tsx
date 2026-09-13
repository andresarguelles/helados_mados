import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import GoogleButton from '../components/auth/GoogleButton'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { User, Eye, EyeOff, Loader2, Zap, AlertTriangle } from 'lucide-react'
import ErrorAlert from '../components/ui/ErrorAlert'

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const login = useStore(s => s.login)
  const profile = useStore(s => s.profile)
  const authReady = useStore(s => s.authReady)

  // If already logged in, redirect once the session has resolved
  useEffect(() => {
    if (authReady && profile) navigate('/perfil', { replace: true })
  }, [authReady, profile, navigate])

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(
    params.get('auth') === 'error' ? 'No pudimos completar el acceso con Google. Intenta de nuevo.' : ''
  )
  // Se enciende cuando alguien falla escribiendo un apodo: puede ser una cuenta nacida con Google.
  const [showGoogleHint, setShowGoogleHint] = useState(false)
  const [loading, setLoading] = useState(false)

  if (profile) return null

  const handleSubmit = async () => {
    setError('')
    setShowGoogleHint(false)

    const value = identifier.trim()
    if (!value || !password) { setError('Completa todos los campos'); return }

    setLoading(true)
    const result = await login(value, password)
    setLoading(false)

    if (!result.success) {
      const looksLikeEmail = value.includes('@')
      setError(looksLikeEmail ? 'Correo o contraseña incorrectos' : 'Usuario o contraseña incorrectos')
      setShowGoogleHint(!looksLikeEmail)
      return
    }

    navigate(result.user.is_admin ? '/admin/dashboard' : '/perfil', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-papel">
      <Navbar />

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <span className="inline-flex items-center gap-1.5 bg-brand-azul/10 text-brand-azul font-mono text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-full">
            <User className="w-3 h-3" />
            Acceso cadete
          </span>
          <div>
            <h1 className="font-heading text-brand-sombra text-3xl">Bienvenido</h1>
            <p className="text-brand-gris text-sm font-body mt-1">
              Ingresa para ver tus puntos y cupones
            </p>
          </div>
        </div>

        {/* Google */}
        <div className="animate-slide-up">
          <GoogleButton next="/perfil" />
        </div>

        {/*
          Un legacy que entre con Google sin vincular primero acaba en una cuenta nueva con 0 puntos:
          su email sintético nunca coincide con su Gmail, así que Supabase no puede auto-vincular.
        */}
        <div className="mt-4 flex gap-2.5 rounded-2xl bg-brand-amarillo/15 border border-brand-amarillo px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-brand-sombra shrink-0 mt-0.5" />
          <p className="text-[11px] text-brand-gris font-body leading-relaxed">
            ¿Ya eras cadete? Entra abajo con tu apodo y vincula Google desde tu perfil, así no
            pierdes tus puntos.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-brand-sombra/10" />
          <span className="text-xs text-brand-gris font-body">¿Ya tienes apodo y contraseña?</span>
          <div className="flex-1 h-px bg-brand-sombra/10" />
        </div>

        {/* Form */}
        <div className="paper-card rounded-3xl p-6 flex flex-col gap-4 animate-slide-up">
          {/*
            Acepta apodo o correo: los cadetes legacy entran con su apodo, y quien nació con Google
            y luego se puso contraseña entra con su correo (su email primario es el Gmail real).
          */}
          <div>
            <label htmlFor="login-username" className="font-heading text-brand-sombra text-xs mb-1.5 block">
              Apodo o correo
            </label>
            <input
              id="login-username"
              type="text"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setError(''); setShowGoogleHint(false) }}
              placeholder="Ej. IceKingXL"
              maxLength={60}
              className="field-input"
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="font-heading text-brand-sombra text-xs mb-1.5 block">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); setShowGoogleHint(false) }}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                placeholder="••••••••"
                className="field-input pr-10"
                autoComplete="current-password"
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

          {/* Error */}
          {error && <ErrorAlert msg={error} />}
          {showGoogleHint && (
            <p className="text-xs text-brand-gris font-body leading-relaxed -mt-1">
              Si creaste tu cuenta con Google, entra con tu correo o usa el botón de arriba.
            </p>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            onClick={handleSubmit}
            disabled={loading}
            className={cn('btn-tinta mt-1', loading && 'opacity-70 cursor-not-allowed')}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-brand-sombra/10" />
          <span className="text-xs text-brand-gris font-body">¿Quieres ganar puntos?</span>
          <div className="flex-1 h-px bg-brand-sombra/10" />
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
