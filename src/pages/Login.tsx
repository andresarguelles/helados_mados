import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import GoogleButton from '../components/auth/GoogleButton'
import { useStore } from '../lib/store'
import { User, Zap } from 'lucide-react'
import ErrorAlert from '../components/ui/ErrorAlert'

/**
 * Solo Google: el acceso con apodo y contraseña se retiró el 2026-09-30. Las cuentas que nunca
 * vincularon Google siguen existiendo con su apodo y sus puntos, pero ya no tienen forma de entrar;
 * quien quiera algo de la suya escribe a contacto@. Aquí no se promete nada al respecto, a propósito.
 */
export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const profile = useStore(s => s.profile)
  const authReady = useStore(s => s.authReady)

  // If already logged in, redirect once the session has resolved
  useEffect(() => {
    if (authReady && profile) navigate('/perfil', { replace: true })
  }, [authReady, profile, navigate])

  // `?auth=error` es un parámetro de la URL: en el prerender no hay `location`, así que el
  // estado inicial tiene que ser el mismo en servidor y cliente. El mensaje llega en un efecto.
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.get('auth') === 'error') {
      setError('No pudimos completar el acceso con Google. Intenta de nuevo.')
    }
    // Solo nos interesa el valor al llegar a la pantalla, no reaccionar a cada cambio de params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (profile) return null

  return (
    <div className="min-h-screen flex flex-col bg-brand-papel">
      <Navbar />

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-4 py-8 pt-24">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <span className="inline-flex items-center gap-1.5 bg-brand-azul/10 text-brand-noche font-mono text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-full">
            <User className="w-3 h-3" />
            Acceso cadete
          </span>
          <div>
            <h1 className="font-heading text-brand-sombra text-3xl">Bienvenido</h1>
            <p className="text-brand-sombra/70 text-sm font-body mt-1">
              Ingresa para ver tus puntos y cupones
            </p>
          </div>
        </div>

        {/* Google: entra quien ya tiene cuenta y la crea quien no. */}
        <div className="paper-card rounded-3xl p-6 flex flex-col gap-4 animate-slide-up">
          <GoogleButton next="/perfil" />
          {error && <ErrorAlert msg={error} />}
          <p className="text-xs text-brand-gris font-body text-center leading-relaxed">
            Ahora se entra solo con Google. Si no tienes cuenta, se crea al momento.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-brand-sombra/10" />
          <span className="text-xs text-brand-sombra/70 font-body">¿Quieres ganar puntos?</span>
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
