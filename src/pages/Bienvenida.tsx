import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, CheckCircle2, Loader2, LogOut, Sparkles, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { normalizePhone, DEFAULT_COUNTRY } from '../lib/phone'
import PhoneField from '../components/ui/PhoneField'
import { readPendingRedeem } from '../lib/pendingRedeem'
import ErrorAlert from '../components/ui/ErrorAlert'

type Availability = 'idle' | 'short' | 'checking' | 'free' | 'taken'

const CHECK_DEBOUNCE_MS = 400

/**
 * Primera pantalla de todo cadete que nace con Google. Pide las tres cosas que Google no aporta y
 * sin las que la cuenta no sirve al negocio: el apodo (identidad pública del ranking), el WhatsApp
 * (el canal de las promociones) y el consentimiento explícito para usarlo.
 *
 * Las tres son obligatorias y se guardan juntas en una sola RPC. El gate de ProtectedMember no deja
 * avanzar sin apodo, y `complete_signup` rechaza en el servidor cualquier intento sin número o sin
 * consentimiento: quitar los campos del formulario no bastaría.
 */
export default function Bienvenida() {
  const navigate = useNavigate()
  const authReady = useStore(s => s.authReady)
  const profile = useStore(s => s.profile)
  const completeSignup = useStore(s => s.completeSignup)
  const isUsernameAvailable = useStore(s => s.isUsernameAvailable)
  const logout = useStore(s => s.logout)

  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [optIn, setOptIn] = useState(false)
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

  // Los tres datos son requisito. El botón deshabilitado evita el viaje al servidor, pero la
  // validación de verdad está en `complete_signup`.
  const canSubmit =
    !loading &&
    availability !== 'taken' &&
    username.trim().length >= 3 &&
    normalizePhone(phone) !== null &&
    optIn

  const handleSubmit = async () => {
    setError('')
    const value = username.trim()

    if (!value) { setError('Elige un apodo'); return }
    if (value.length < 3) { setError('El apodo debe tener al menos 3 caracteres'); return }

    const e164 = normalizePhone(phone)
    if (!e164) {
      const faltan = DEFAULT_COUNTRY.nationalDigits - phone.length
      setError(
        faltan > 0
          ? `Tu WhatsApp debe tener ${DEFAULT_COUNTRY.nationalDigits} dígitos. Te ${faltan === 1 ? 'falta' : 'faltan'} ${faltan}.`
          : 'Ese número no parece de México. Revisa que empiece con tu lada (ej. 55, 33, 81).'
      )
      return
    }
    if (!optIn) {
      setError('Necesitamos tu permiso para escribirte por WhatsApp.')
      return
    }

    setLoading(true)
    const result = await completeSignup({ username: value, phone: e164, whatsappOptIn: optIn })
    setLoading(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        username_taken: 'Ese apodo ya está en uso. Elige otro.',
        too_short: 'El apodo debe tener al menos 3 caracteres',
        already_set: 'Ya tienes un apodo asignado.',
        consent_required: 'Necesitamos tu permiso para escribirte por WhatsApp.',
        invalid_phone: 'Ese número no parece válido. Revísalo e intenta de nuevo.',
        phone_taken: 'Ese número ya está registrado en otra cuenta.',
        not_authenticated: 'Tu sesión expiró. Vuelve a entrar.',
      }
      setError(messages[result.reason] ?? 'No pudimos crear tu cuenta. Intenta de nuevo.')
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
            <h1 className="font-heading text-brand-sombra text-3xl">Crea tu cuenta</h1>
            <p className="text-brand-gris text-sm font-body mt-1 leading-relaxed">
              Nos faltan dos datos que Google no nos da. Se piden una sola vez.
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

          <div>
            <PhoneField
              id="bienvenida-phone"
              label="Tu WhatsApp"
              value={phone}
              onChange={value => { setPhone(value); setError('') }}
            />
            {/* Se avisa antes de guardarlo, no cuando ya es tarde para corregirlo. */}
            <p className="text-[11px] text-brand-gris font-body mt-1.5 leading-relaxed">
              Por aquí te avisamos de las dinámicas y promos.{' '}
              <span className="font-bold text-brand-sombra">Revísalo bien: después no se puede cambiar.</span>
            </p>
          </div>

          {/* El consentimiento va explícito y con fecha: es lo que exige el aviso de privacidad, y
              aquí además es requisito para que la cuenta exista. */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => { setOptIn(v => !v); setError('') }}
              className={cn(
                'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                optIn ? 'bg-brand-azul border-brand-sombra' : 'border-brand-sombra/30 hover:border-brand-azul'
              )}
            >
              {optIn && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-xs text-brand-gris font-body leading-relaxed">
              Acepto recibir mensajes con dinámicas y/o publicidad de Helados Mados por WhatsApp.
              Puedo cancelarlo cuando quiera desde mi perfil.
            </span>
          </label>

          {error && <ErrorAlert msg={error} />}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn('btn-fresa', !canSubmit && 'opacity-70 cursor-not-allowed')}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creando tu cuenta...' : 'Empezar'}
          </button>

          {!optIn && (
            <p className="text-[11px] text-brand-gris font-body text-center leading-relaxed -mt-1">
              Sin aceptar los mensajes de WhatsApp no podemos crear tu cuenta.
            </p>
          )}
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
