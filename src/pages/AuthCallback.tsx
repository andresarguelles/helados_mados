import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { readPendingRedeem } from '../lib/pendingRedeem'
import { readAuthIntent, clearAuthIntent } from '../lib/authIntent'

// Cuántos ms esperar a que `detectSessionInUrl` termine de canjear el ?code= antes de rendirse.
const EXCHANGE_TIMEOUT_MS = 8000

/**
 * Aterrizaje del redirect de Google, tanto para iniciar sesión como para vincular.
 * No tiene UI propia: solo decide a dónde mandar al usuario.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const authReady = useStore(s => s.authReady)
  const profile = useStore(s => s.profile)
  const claimGoogleBonus = useStore(s => s.claimGoogleBonus)
  const decided = useRef(false)

  useEffect(() => {
    if (!authReady || decided.current) return

    // Google puede devolver un error sin llegar a crear sesión (el usuario canceló, consent revocado).
    if (params.get('error')) {
      decided.current = true
      navigate('/login?auth=error', { replace: true })
      return
    }

    // `authReady` puede llegar a true antes de que el intercambio del ?code= termine, así que un
    // perfil vacío todavía no significa fracaso: se espera al evento SIGNED_IN y, si no llega, se sale.
    if (!profile) {
      const timer = setTimeout(() => {
        if (decided.current) return
        decided.current = true
        navigate('/login?auth=error', { replace: true })
      }, EXCHANGE_TIMEOUT_MS)
      return () => clearTimeout(timer)
    }

    decided.current = true

    const run = async () => {
      // Idempotente y verificado contra auth.identities: devuelve 0 si no hay identidad de Google
      // o si el bono ya se otorgó. Por eso se puede llamar en todo aterrizaje sin condicionarlo.
      const pointsAwarded = await claimGoogleBonus()

      // La intención se lee sin consumirla: arriba hay una salida temprana mientras se espera el
      // canje del ?code=, y una lectura destructiva ahí perdería el destino. Se borra al navegar.
      const intent = readAuthIntent()
      clearAuthIntent()

      if (!profile.username) {
        navigate('/bienvenida', { replace: true, state: { pointsAwarded } })
        return
      }

      if (readPendingRedeem()) {
        navigate('/canjear', { replace: true })
        return
      }

      navigate(intent?.next ?? '/perfil', {
        replace: true,
        state: { pointsAwarded, linked: intent?.linking === true },
      })
    }

    void run()
  }, [authReady, profile, params, navigate, claimGoogleBonus])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-brand-azul bg-dots-azul px-4">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
      <p className="font-heading text-white text-sm uppercase tracking-wide">Conectando tu cuenta...</p>
    </div>
  )
}
