/**
 * Compuerta de re-aceptación: cuando se publica una versión nueva del texto legal, el
 * usuario que ya tiene cuenta tiene que volver a aceptar antes de seguir usando la app.
 *
 * Existe porque la constancia de aceptación solo vale si está atada a una VERSIÓN. Sin
 * esto, publicar un texto nuevo dejaría a todo el padrón con una aceptación de otro
 * documento, que es como no tener ninguna.
 *
 * DOS DECISIONES QUE PARECEN DETALLES Y NO LO SON:
 *
 * 1. Si la consulta falla —sin red, servidor caído— NO se bloquea. Esto es un requisito
 *    legal, no un control de seguridad: dejar la app inservible por un fallo de red sería
 *    mucho peor que enseñar una versión tarde. El servidor vuelve a preguntar en la
 *    siguiente carga.
 * 2. Si no hay ninguna versión publicada, `pendientes` viene vacío y aquí no aparece nada.
 *    Es el estado normal hasta que el texto se siembra en `legal_versions`.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Scale } from 'lucide-react'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import { LEGAL_DOCS } from '../../content/legal/generated/legalContent'
import ErrorAlert from '../ui/ErrorAlert'

const RUTAS: Record<string, string> = { privacidad: '/privacidad', terminos: '/terminos' }

type Estado = 'consultando' | 'al-dia' | 'pendiente'

export default function LegalGate({ children }: { children: React.ReactNode }) {
  const profile = useStore((s) => s.profile)
  const getLegalStatus = useStore((s) => s.getLegalStatus)
  const acceptLegal = useStore((s) => s.acceptLegal)

  const [estado, setEstado] = useState<Estado>('consultando')
  const [pendientes, setPendientes] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const userId = profile?.id ?? null

  useEffect(() => {
    if (!userId) return
    let cancelado = false
    getLegalStatus().then((r) => {
      if (cancelado) return
      // 'desconocido' cae aquí a propósito: ante la duda, se deja pasar.
      if (r.estado === 'pendiente') {
        setPendientes(r.docs)
        setEstado('pendiente')
      } else {
        setEstado('al-dia')
      }
    })
    return () => {
      cancelado = true
    }
  }, [userId, getLegalStatus])

  const aceptar = useCallback(async () => {
    setError('')
    setGuardando(true)
    const ok = await acceptLegal()
    setGuardando(false)
    if (ok) setEstado('al-dia')
    else setError('No pudimos guardar tu aceptación. Revisa tu conexión e intenta de nuevo.')
  }, [acceptLegal])

  // Mientras se consulta no se tapa la app: el caso normal es que no haya nada pendiente,
  // y un parpadeo en cada carga sería peor que enseñar la compuerta medio segundo tarde.
  if (estado !== 'pendiente') return <>{children}</>

  const nombres = pendientes.map((id) => LEGAL_DOCS[id]?.titulo ?? id)

  return (
    <div className="min-h-screen bg-brand-papel flex items-center justify-center px-4 py-10">
      <div className="paper-card rounded-3xl p-6 w-full max-w-md flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Scale className="w-7 h-7 text-brand-azul shrink-0" />
          <h1 className="font-heading text-brand-sombra text-lg">Actualizamos nuestros documentos</h1>
        </div>

        <p className="font-body text-brand-gris text-sm leading-relaxed">
          Cambiamos {nombres.length === 1 ? 'un documento' : 'los documentos'} que rigen tu cuenta.
          Para seguir usando Helados Mados necesitamos que {nombres.length === 1 ? 'lo leas' : 'los leas'} y{' '}
          {nombres.length === 1 ? 'lo aceptes' : 'los aceptes'}. Tus puntos y tus cupones no se tocan.
        </p>

        <ul className="flex flex-col gap-2">
          {pendientes.map((id) => (
            <li key={id}>
              <Link
                to={RUTAS[id] ?? '/terminos'}
                target="_blank"
                className="lb-row font-body text-sm text-brand-azul font-bold underline"
              >
                {LEGAL_DOCS[id]?.titulo ?? id}
              </Link>
            </li>
          ))}
        </ul>

        {error && <ErrorAlert msg={error} />}

        <button
          onClick={aceptar}
          disabled={guardando}
          className={cn('btn-fresa', guardando && 'opacity-70 cursor-not-allowed')}
        >
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          {guardando ? 'Guardando...' : 'Acepto'}
        </button>

        <p className="font-body text-brand-gris text-[11px] text-center leading-relaxed">
          Guardamos la fecha y la versión que aceptas. Puedes darte de baja cuando quieras desde tu
          perfil.
        </p>
      </div>
    </div>
  )
}
