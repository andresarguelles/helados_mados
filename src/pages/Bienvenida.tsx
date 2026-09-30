import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Loader2, LogOut, Shield, Sparkles, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import { normalizePhone, DEFAULT_COUNTRY } from '../lib/phone'
import PhoneField from '../components/ui/PhoneField'
import { readPendingRedeem } from '../lib/pendingRedeem'
import ErrorAlert from '../components/ui/ErrorAlert'
import Modal from '../components/ui/Modal'
import { useBottomNavVisible } from '../components/layout/BottomNav'
import LegalBlocks from '../components/legal/LegalBlocks'
import { AVISO_SIMPLIFICADO } from '../content/legal/generated/legalSimplificado'

type Availability = 'idle' | 'short' | 'checking' | 'free' | 'taken'

const CHECK_DEBOUNCE_MS = 400

/**
 * Primera pantalla de todo cadete que nace con Google. Pide lo que Google no aporta: el apodo
 * (identidad pública del ranking), el WhatsApp (un número, una cuenta) y la aceptación del texto
 * legal junto con la declaración de mayoría de edad.
 *
 * Todo se guarda junto en una sola RPC, así que no puede quedar un apodo tomado por una cuenta
 * sin número ni una cuenta sin constancia de qué texto aceptó su dueño. El gate de
 * ProtectedMember no deja avanzar sin apodo y `complete_signup` revalida en el servidor: quitar
 * campos del formulario no bastaría.
 *
 * DOS CASILLAS, y la separación importa. La primera junta los 18 años y la aceptación de los
 * documentos, porque las dos son términos del contrato. La segunda, el permiso para mandar
 * mensajes, va aparte y es OPCIONAL: es tratamiento de datos para publicidad, y condicionar el
 * alta a aceptarlo haría que el consentimiento no fuera libre. Hasta la migración 0023 era
 * obligatorio, y ese era el punto más atacable de todo el producto.
 *
 * NADA LARGO A LA VISTA. Es la pantalla con más abandono del embudo, así que el aviso corto y
 * el aviso a cadetes legacy están a un toque, y cada casilla cabe en una o dos líneas. Las
 * casillas no se pueden quitar sin publicar una versión legal nueva: los Términos dicen que se
 * marca una casilla para declarar la edad, y el Aviso, que el permiso de WhatsApp se da (o no)
 * marcando otra al crear la cuenta.
 */
export default function Bienvenida() {
  const navigate = useNavigate()
  const authReady = useStore(s => s.authReady)
  const profile = useStore(s => s.profile)
  const completeSignup = useStore(s => s.completeSignup)
  const isUsernameAvailable = useStore(s => s.isUsernameAvailable)
  const logout = useStore(s => s.logout)
  const navVisible = useBottomNavVisible()

  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [optIn, setOptIn] = useState(false)
  const [aceptaLegal, setAceptaLegal] = useState(false)
  const [avisoAbierto, setAvisoAbierto] = useState(false)
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

  // El botón deshabilitado evita el viaje al servidor, pero la validación de verdad está en
  // `complete_signup`. Ojo: `optIn` NO entra aquí — es opcional desde la 0023.
  const canSubmit =
    !loading &&
    availability !== 'taken' &&
    username.trim().length >= 3 &&
    normalizePhone(phone) !== null &&
    aceptaLegal

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
    if (!aceptaLegal) {
      setError('Para crear tu cuenta necesitas ser mayor de edad y aceptar los documentos.')
      return
    }

    setLoading(true)
    const result = await completeSignup({
      username: value,
      phone: e164,
      whatsappOptIn: optIn,
      ageConfirmed: aceptaLegal,
    })
    setLoading(false)

    if (!result.success) {
      const messages: Record<string, string> = {
        username_taken: 'Ese apodo ya está en uso. Elige otro.',
        too_short: 'El apodo debe tener al menos 3 caracteres',
        already_set: 'Ya tienes un apodo asignado.',
        invalid_phone: 'Ese número no parece válido. Revísalo e intenta de nuevo.',
        phone_taken: 'Ese número ya está registrado en otra cuenta.',
        not_authenticated: 'Tu sesión expiró. Vuelve a entrar.',
        age_required: 'Para crear tu cuenta tienes que ser mayor de edad.',
        legal_required: 'Falta aceptar los Términos y el Aviso de Privacidad.',
        legal_incomplete: 'Falta aceptar los Términos y el Aviso de Privacidad.',
        // Casi siempre es una pestaña vieja mostrando un texto que ya se actualizó.
        unknown_version: 'Los documentos cambiaron. Recarga la página y vuelve a intentar.',
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
    <div className={cn('min-h-screen flex flex-col bg-brand-papel', navVisible && 'pb-24')}>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-4 py-10">

        {/* Cabecera */}
        <div className="flex flex-col items-center text-center gap-3 mb-7">
          <span className="inline-flex items-center gap-1.5 bg-brand-azul/10 text-brand-noche font-mono text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3" />
            Último paso
          </span>
          <div>
            <h1 className="font-heading text-brand-sombra text-3xl">Crea tu cuenta</h1>
            <p className="text-brand-gris text-sm font-body mt-1 leading-relaxed">
              Nos falta lo que Google no nos da. Se pide una sola vez.
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
            {/* Se avisa antes de guardarlo, no cuando ya es tarde para corregirlo. El número es
                requisito por antifraude —un número, una cuenta—, no por mandarte publicidad. */}
            <p className="text-[11px] text-brand-gris font-body mt-1.5 leading-relaxed">
              Un número por cuenta.{' '}
              <span className="font-bold text-brand-sombra">Revísalo bien: no se puede cambiar.</span>
            </p>
          </div>

          {/*
            El aviso simplificado, a un toque y en el punto donde se recolectan los datos: después
            de pedirlos y antes de "Empezar". Sale del mismo documento que /privacidad, así que no
            puede divergir de él. Estuvo abierto por omisión y eran seis párrafos entre el teléfono
            y el botón; plegarlo fue decisión del dueño por el abandono de esta pantalla.
          */}
          <button
            type="button"
            onClick={() => setAvisoAbierto(true)}
            className="self-start inline-flex items-center gap-1.5 text-xs font-body font-bold text-brand-azul underline"
          >
            <Shield className="w-3.5 h-3.5" />
            Aviso de privacidad en corto
          </button>

          {/* OBLIGATORIA. Junta edad y aceptación porque las dos son términos del contrato. */}
          <label className="flex items-start gap-3 cursor-pointer">
            <div
              onClick={() => { setAceptaLegal(v => !v); setError('') }}
              className={cn(
                'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                aceptaLegal ? 'bg-brand-azul border-brand-sombra' : 'border-brand-sombra/30 hover:border-brand-azul'
              )}
            >
              {aceptaLegal && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
            </div>
            <span className="text-xs text-brand-gris font-body leading-relaxed">
              Tengo 18 años o más y acepto los{' '}
              <Link to="/terminos" target="_blank" className="text-brand-azul font-bold underline">
                Términos
              </Link>{' '}
              y el{' '}
              <Link to="/privacidad" target="_blank" className="text-brand-azul font-bold underline">
                Aviso de Privacidad
              </Link>.
            </span>
          </label>

          {/*
            OPCIONAL, y esa es la diferencia que importa. Condicionar el alta a aceptar publicidad
            haría que el consentimiento no fuera libre, y un consentimiento no libre no es
            consentimiento: arrastraría a todo el aviso. Ver la migración 0023.
          */}
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
              <span className="font-bold text-brand-sombra">Opcional:</span> avísenme de promos por WhatsApp.
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

          {!aceptaLegal && (
            <p className="text-[11px] text-brand-gris font-body text-center leading-relaxed -mt-1">
              Para crear tu cuenta necesitas aceptar los documentos.
            </p>
          )}
        </div>

        {/*
          Un cadete legacy que entra con Google sin haber vinculado primero termina en una cuenta
          nueva con 0 puntos: su email sintético nunca coincide con su Gmail, así que Supabase no
          puede auto-vincular. Este aviso es la única defensa antes de que se lleve la sorpresa.
          Va plegado a una pregunta: quien lo necesita se reconoce en ella, y los demás —casi
          todos— no cargan con el párrafo.
        */}
        <details className="group mt-6 rounded-3xl border-2 border-brand-amarillo bg-brand-amarillo/15 px-4 py-3">
          <summary className="flex items-center gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden font-heading text-brand-sombra text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="flex-1">¿Ya tenías cuenta con apodo y contraseña?</span>
            <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 pl-6 flex flex-col gap-2">
            <p className="text-xs text-brand-gris font-body leading-relaxed">
              Esta es una cuenta nueva y tus puntos no están aquí. Sal, entra con tu apodo de
              siempre y vincula Google desde tu perfil.
            </p>
            <button
              onClick={handleLogout}
              className="self-start inline-flex items-center gap-2 font-heading text-[11px] uppercase tracking-wide text-brand-azul underline"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir y entrar con mi apodo
            </button>
          </div>
        </details>
      </div>

      <Modal open={avisoAbierto} onClose={() => setAvisoAbierto(false)} labelledBy="aviso-corto-titulo">
        <div className="relative bg-brand-papel w-full max-w-sm rounded-3xl border-2 border-brand-sombra shadow-sticker-lg p-6 flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-scale-in">
          <div className="flex items-start justify-between gap-4">
            <h2 id="aviso-corto-titulo" className="font-heading text-brand-sombra text-lg">
              {AVISO_SIMPLIFICADO.titulo} · cómo tratamos tus datos
            </h2>
            <button
              onClick={() => setAvisoAbierto(false)}
              aria-label="Cerrar"
              className="text-brand-gris hover:text-brand-sombra transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* En pestaña nueva: seguir el enlace al integral aquí desmontaría el formulario. */}
          <LegalBlocks bloques={AVISO_SIMPLIFICADO.bloques} enlacesLegalesEnPestanaNueva />

          <button onClick={() => setAvisoAbierto(false)} className="btn-fresa mt-1">
            Entendido
          </button>
        </div>
      </Modal>
    </div>
  )
}
