/**
 * Página pública de baja de cuenta.
 *
 * Es PÚBLICA a propósito, y esa es la razón de que exista como página y no solo como un
 * botón dentro del perfil: Google Play exige una URL donde cualquiera pueda encontrar cómo
 * borrar su cuenta **sin instalar la app**. Es también el derecho de Cancelación de ARCO,
 * y el aviso de privacidad la nombra por su dirección.
 *
 * Con sesión, borra de verdad. Sin sesión, explica cómo hacerlo y da el correo del
 * responsable, porque alguien que ya desinstaló la app sigue teniendo ese derecho.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { cn } from '../lib/utils'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ErrorAlert from '../components/ui/ErrorAlert'

const CORREO = 'contacto@heladosmados.com'

export default function EliminarCuenta() {
  const navigate = useNavigate()
  const authReady = useStore((s) => s.authReady)
  const profile = useStore((s) => s.profile)
  const deleteMyAccount = useStore((s) => s.deleteMyAccount)

  const [confirmado, setConfirmado] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState('')

  const borrar = async () => {
    setError('')
    setBorrando(true)
    const r = await deleteMyAccount()
    setBorrando(false)
    if (r.success) {
      navigate('/', { replace: true })
      return
    }
    const mensajes: Record<string, string> = {
      admin_cannot_delete:
        'Las cuentas del personal no se borran desde aquí. Escríbenos y lo hacemos nosotros.',
      not_authenticated: 'Tu sesión expiró. Vuelve a entrar e inténtalo otra vez.',
    }
    setError(mensajes[r.reason] ?? 'No pudimos borrar tu cuenta. Inténtalo de nuevo o escríbenos.')
  }

  return (
    <div className="min-h-screen bg-brand-papel">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 pt-20 pb-12 flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <Trash2 className="w-7 h-7 text-brand-azul shrink-0" />
          <h1 className="font-heading text-brand-sombra text-2xl">Eliminar mi cuenta</h1>
        </header>

        <section className="paper-card rounded-3xl p-5 font-body text-brand-gris text-sm leading-relaxed flex flex-col gap-3">
          <p>Al eliminar tu cuenta borramos de forma permanente:</p>
          <ul className="list-disc list-outside pl-5 flex flex-col gap-1.5">
            <li>Tu perfil: apodo, correo, teléfono, nombre y fecha de nacimiento.</li>
            <li>Tus cupones, canjeados o no.</li>
            <li>Tus puntos y tu lugar en el marcador.</li>
          </ul>
          <p className="font-semibold text-brand-sombra">
            No se puede deshacer. No hay forma de recuperar tus puntos después.
          </p>
        </section>

        {/* Lo que sobrevive se dice aquí y no solo en el aviso: prometer un borrado total y
            conservar cosas es peor que explicar exactamente qué queda y por qué. */}
        <section className="paper-card rounded-3xl p-5 font-body text-brand-gris text-sm leading-relaxed flex flex-col gap-3">
          <h2 className="font-heading text-brand-sombra text-base">Qué conservamos, y por qué</h2>
          <ul className="list-disc list-outside pl-5 flex flex-col gap-1.5">
            <li>
              <span className="font-semibold text-brand-sombra">El registro de que aceptaste
              estos documentos</span> — la versión y la fecha. Es la única prueba de que el
              consentimiento existió, y por eso no puede desaparecer con la cuenta. Queda
              bloqueado, sin usarse para nada más.
            </li>
            <li>
              <span className="font-semibold text-brand-sombra">Los registros técnicos
              antiabuso</span> derivados de direcciones de internet. No están ligados a ti:
              no sabríamos cuáles son los tuyos ni aunque quisiéramos.
            </li>
          </ul>
          {/* El autoborrado NO deja constancia; la baja que ejecutamos nosotros sí. La
              distinción importa y por eso se dice aquí, no solo en el aviso. */}
          <p>
            Si en vez de hacerlo aquí nos lo pides por correo, queda además constancia de que
            la ejecutamos nosotros: quién y cuándo, sin tus datos de contacto.
          </p>
          <p>
            Está explicado a detalle en el{' '}
            <Link to="/privacidad" className="text-brand-azul font-bold underline">
              Aviso de Privacidad
            </Link>
            .
          </p>
        </section>

        {!authReady ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-brand-azul" />
          </div>
        ) : profile ? (
          <section className="paper-card rounded-3xl p-5 flex flex-col gap-4">
            <p className="font-body text-brand-gris text-sm">
              Vas a eliminar la cuenta de{' '}
              <span className="font-heading text-brand-sombra">{profile.username ?? 'tu perfil'}</span>.
            </p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmado}
                onChange={(e) => { setConfirmado(e.target.checked); setError('') }}
                className="mt-0.5 w-5 h-5 shrink-0 accent-brand-azul"
              />
              <span className="text-xs text-brand-gris font-body leading-relaxed">
                Entiendo que esto es permanente y que perderé mis puntos y mis cupones.
              </span>
            </label>

            {error && <ErrorAlert msg={error} />}

            <button
              onClick={borrar}
              disabled={!confirmado || borrando}
              className={cn('btn-tinta', (!confirmado || borrando) && 'opacity-70 cursor-not-allowed')}
            >
              {borrando && <Loader2 className="w-4 h-4 animate-spin" />}
              {borrando ? 'Eliminando...' : 'Eliminar mi cuenta'}
            </button>
          </section>
        ) : (
          <section className="paper-card rounded-3xl p-5 font-body text-brand-gris text-sm leading-relaxed flex flex-col gap-3">
            <h2 className="font-heading text-brand-sombra text-base">Cómo pedirlo</h2>
            <p>
              Entra a tu cuenta y vuelve a esta página: el botón para eliminarla aparece aquí
              mismo.
            </p>
            <Link to="/login" className="btn-fresa w-fit">
              Iniciar sesión
            </Link>
            <p>
              Si ya no puedes entrar, escríbenos a{' '}
              <a href={`mailto:${CORREO}`} className="text-brand-azul font-bold underline">
                {CORREO}
              </a>{' '}
              desde el correo de tu cuenta y la eliminamos nosotros. Te respondemos en un plazo
              máximo de veinte días hábiles.
            </p>
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
