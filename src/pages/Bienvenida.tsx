import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, Loader2, LogOut, Sparkles, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { readPendingRedeem } from '../lib/pendingRedeem'
import ErrorAlert from '../components/ui/ErrorAlert'

type Availability = 'idle' | 'short' | 'checking' | 'free' | 'taken'

const CHECK_DEBOUNCE_MS = 400

/**
 * Primera pantalla de todo cadete que nace con Google: el apodo es la identidad pública del
 * ranking y Google no lo aporta, así que se pide aquí y el gate de ProtectedMember no deja
 * avanzar sin él.
 */
export default function Bienvenida() {
  const navigate = useNavigate()
  const authReady = useStore(s => s.authReady)
  const profile = useStore(s => s.profile)
  const claimUsername = useStore(s => s.claimUsername)
  const isUsernameAvailable = useStore(s => s.isUsernameAvailable)
  const logout = useStore(s => s.logout)

  const [username, setUsername] = useState('')
  const [availability, setAvailability] = useState<Availability>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authReady) return
    if (!profile) navigate('/login', { replace: true })
    else if (profile.username) navigate('/perfil', { replace: true })
  }, [authReady, profile, navigate])

  // Comprobación de disponibilidad con debounce, para no disparar una RPC por tecla.
  useEffect(() => {
    const value = username.trim()

    if (value.length === 0) { setAvailability('idle'); return }
    if (value.length < 3) { setAvailability('short'); return }

    setAvailability('checking')
    const timer = setTimeout(async () => {
      const available = await isUsernameAvailable(value)
      setAvailability(available === null ? 'idle' : available ? 'free' : 'taken')
    }, CHECK_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [username, isUsernameAvailable])

  if (!authReady || !profile || profile.username) return null

  const handleSubmit = async () => {
    setError('')
    const value = username.trim()

    if (!value) { setError('Elige un apodo'); return }
    if (value.length < 3) { setError('El apodo debe tener al menos 3 caracteres'); return }

    setLoading(true)
    const result = await claimUsername(value)
    setLoading(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        username_taken: 'Ese apodo ya está en uso. Elige otro.',
        too_short: 'El apodo debe tener al menos 3 caracteres',
        already_set: 'Ya tienes un apodo asignado.',
        not_authenticated: 'Tu sesión expiró. Vuelve a entrar.',
      }
      setError(messages[result.reason] ?? 'No pudimos guardar tu apodo. Intenta de nuevo.')
      return
    }

    // Si venía de /canjear, allá se reanuda el canje con la palabra guardada.
    navigate(readPendingRedeem() ? '/canjear' : '/perfil', { replace: true })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col bg-brand-papel">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-4 py-10">

        {/* Cabecera */}
        <div className="flex flex-col items-center text-center gap-3 mb-7">
          <span className="inline-flex items-center gap-1.5 bg-brand-azul/10 text-brand-azul font-mono text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            Último paso
          </span>
          <div>
            <h1 className="font-heading text-brand-sombra text-3xl">Elige tu apodo</h1>
            <p className="text-brand-gris text-sm font-body mt-1 leading-relaxed">
              Así te van a ver en el ranking y en el mostrador. Se elige una sola vez.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="paper-card rounded-3xl p-6 flex flex-col gap-4 animate-slide-up">
          <div>
            <label htmlFor="bienvenida-username" className="font-heading text-brand-sombra text-xs mb-1.5 block">
              Tu apodo
            </label>
            <div className="relative">
              <input
                id="bienvenida-username"
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && !loading && handleSubmit()}
                placeholder="Ej. IceKingXL"
                maxLength={20}
                className="field-input pr-10"
                autoComplete="off"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {availability === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-brand-gris" />}
                {availability === 'free' && <Check className="w-4 h-4 text-brand-azul" />}
                {availability === 'taken' && <X className="w-4 h-4 text-brand-rosa" />}
              </span>
            </div>

            <p
              className={cn(
                'text-xs font-body mt-1.5 min-h-[1rem]',
                availability === 'taken' ? 'text-brand-rosa' : 'text-brand-gris'
              )}
              aria-live="polite"
            >
              {availability === 'short' && 'Mínimo 3 caracteres'}
              {availability === 'free' && '¡Disponible!'}
              {availability === 'taken' && 'Ese apodo ya está en uso'}
            </p>
          </div>

          {error && <ErrorAlert msg={error} />}

          <button
            onClick={handleSubmit}
            disabled={loading || availability === 'taken'}
            className={cn('btn-fresa', (loading || availability === 'taken') && 'opacity-70 cursor-not-allowed')}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Guardando...' : 'Empezar'}
          </button>
        </div>

        {/*
          Un cadete legacy que entra con Google sin haber vinculado primero termina en una cuenta
          nueva con 0 puntos: su email sintético nunca coincide con su Gmail, así que Supabase no
          puede auto-vincular. Este aviso es la única defensa antes de que se lleve la sorpresa.
        */}
        <div className="mt-6 rounded-3xl border-2 border-brand-amarillo bg-brand-amarillo/15 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-brand-sombra shrink-0 mt-0.5" />
          <div className="flex flex-col gap-2">
            <p className="font-heading text-brand-sombra text-xs uppercase tracking-wide">
              ¿Ya eras cadete?
            </p>
            <p className="text-xs text-brand-gris font-body leading-relaxed">
              Si ya tenías cuenta con apodo y contraseña, esta es una cuenta nueva y tus puntos no
              están aquí. Sal, entra con tu apodo de siempre y vincula Google desde tu perfil.
            </p>
            <button
              onClick={handleLogout}
              className="self-start inline-flex items-center gap-2 font-heading text-[11px] uppercase tracking-wide text-brand-azul underline"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir y entrar con mi apodo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
