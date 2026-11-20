import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { clearAuthIntent, saveAuthIntent } from '../../lib/authIntent'
import { entrarConCorreo } from '../../lib/correo'
import { cn } from '../../lib/utils'
import ErrorAlert from '../ui/ErrorAlert'

interface EntrarConCorreoProps {
  /** Ruta a la que volver después de entrar. */
  next?: string
  /** Mismo gancho que GoogleButton: última oportunidad de persistir estado. */
  onBeforeRedirect?: () => void
  className?: string
}

/**
 * Entrada con correo y contraseña, solo fuera de producción (Story 6.8): GoogleButton lo carga con
 * import() dentro de una condición sobre `__MADOS_ENTORNO__`, así que en el build de producción
 * este módulo no existe. Al entrar va a /auth/callback, que decide el destino igual que con Google.
 */
export default function EntrarConCorreo({ next, onBeforeRedirect, className }: EntrarConCorreoProps) {
  const navigate = useNavigate()
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (enviando) return
    setError('')
    setEnviando(true)
    onBeforeRedirect?.()
    saveAuthIntent({ next: next ?? '/perfil' })

    const resultado = await entrarConCorreo(correo.trim(), contrasena)
    if (resultado.ok) {
      navigate('/auth/callback', { replace: true })
      return
    }
    clearAuthIntent()
    setContrasena('')
    setEnviando(false)
    setError(
      resultado.motivo === 'credenciales' ? 'Correo o contraseña incorrectos.'
        : resultado.motivo === 'sin_red' ? 'No hay conexión. Inténtalo otra vez.'
          : 'No se pudo entrar. Intenta otra vez.'
    )
  }

  return (
    <form onSubmit={enviar} className={cn('flex flex-col gap-3', className)}>
      <h2 className="font-heading text-sm uppercase tracking-wide text-brand-sombra">Entrar con correo</h2>
      <label className="flex flex-col gap-1 font-body text-sm text-brand-sombra">
        Correo
        <input
          type="email"
          name="correo"
          autoComplete="username"
          required
          value={correo}
          onChange={e => setCorreo(e.target.value)}
          className="field-input"
        />
      </label>
      <label className="flex flex-col gap-1 font-body text-sm text-brand-sombra">
        Contraseña
        <input
          type="password"
          name="contrasena"
          autoComplete="current-password"
          required
          value={contrasena}
          onChange={e => setContrasena(e.target.value)}
          className="field-input"
        />
      </label>
      <button
        type="submit"
        disabled={enviando}
        className={cn(
          'inline-flex items-center justify-center gap-3 w-full bg-white text-brand-sombra',
          'font-heading text-sm uppercase tracking-wide rounded-2xl px-6 py-3.5',
          'border-2 border-brand-sombra shadow-sticker',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker-lg',
          'active:translate-x-1 active:translate-y-1 active:shadow-none',
          'transition-all duration-150',
          enviando && 'opacity-70 cursor-not-allowed'
        )}
      >
        {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
        {enviando ? 'Entrando...' : 'Entrar'}
      </button>
      {error && <ErrorAlert msg={error} />}
    </form>
  )
}
