import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import ErrorAlert from '../ui/ErrorAlert'

// Las reglas de marca de Google piden su logo a color sobre un botón claro y un texto del tipo
// "Continuar con Google" — no un botón con la identidad de Helados Mados.
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z" />
      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z" />
    </svg>
  )
}

interface GoogleButtonProps {
  label?: string
  /** Ruta a la que volver después del redirect. */
  next?: string
  /** Última oportunidad de persistir estado: el navegador está a punto de irse a Google. */
  onBeforeRedirect?: () => void
  className?: string
}

export default function GoogleButton({
  label = 'Continuar con Google',
  next,
  onBeforeRedirect,
  className,
}: GoogleButtonProps) {
  const signInWithGoogle = useStore(s => s.signInWithGoogle)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    setError('')
    setLoading(true)
    onBeforeRedirect?.()

    const result = await signInWithGoogle(next)
    // En el camino feliz el navegador ya se fue a Google y nada de esto se ejecuta.
    if (!result.success) {
      setLoading(false)
      setError('No pudimos conectar con Google. Intenta de nuevo.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={cn(
          'inline-flex items-center justify-center gap-3 w-full bg-white text-brand-sombra',
          'font-heading text-sm uppercase tracking-wide rounded-2xl px-6 py-3.5',
          'border-2 border-brand-sombra shadow-sticker',
          'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-sticker-lg',
          'active:translate-x-1 active:translate-y-1 active:shadow-none',
          'transition-all duration-150',
          loading && 'opacity-70 cursor-not-allowed',
          className
        )}
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <GoogleLogo className="w-[18px] h-[18px]" />}
        {loading ? 'Conectando...' : label}
      </button>

      {error && <ErrorAlert msg={error} />}
    </div>
  )
}
