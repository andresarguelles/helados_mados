import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Pide al navegador que no apague la pantalla mientras la vista esté abierta. El bloqueo se
 * suelta solo cuando la pestaña deja de estar visible, así que se vuelve a pedir al regresar.
 * Si el navegador no lo soporta o lo niega, no pasa nada: queda en manos del sistema.
 */
function usePantallaEncendida() {
  useEffect(() => {
    let bloqueo: WakeLockSentinel | null = null
    let activo = true

    const pedir = async () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
      try {
        const nuevo = await navigator.wakeLock.request('screen')
        if (activo) bloqueo = nuevo
        else void nuevo.release()
      } catch {
        // Sin permiso o sin contexto seguro: el monitor sigue su configuración de energía.
      }
    }

    void pedir()
    document.addEventListener('visibilitychange', pedir)
    return () => {
      activo = false
      document.removeEventListener('visibilitychange', pedir)
      void bloqueo?.release()
    }
  }, [])
}

/**
 * Lo mínimo de una pantalla de mostrador: un monitor vertical (1080×1920) en modo quiosco que
 * nadie toca. Ocupa exactamente el alto de la pantalla, nunca desplaza la página, mantiene el
 * monitor encendido y deja una salida para el personal. El diseño de adentro es de cada vista.
 *
 * Los tamaños de las vistas van en `vh` para que se lean a distancia en cualquier monitor
 * vertical: a 1920 px de alto, 1vh son ~19 px.
 */
export function KioscoMarco({ className, children }: { className?: string; children: ReactNode }) {
  usePantallaEncendida()

  return (
    // Concatenado y no con cn(): tailwind-merge toma `bg-dots-azul` (la trama) por un color de
    // fondo y borraría el `bg-brand-azul` que la acompaña.
    <div className={`h-screen w-full overflow-hidden flex flex-col ${className ?? ''}`}>
      {children}

      {/* Invisible para el público; aparece al pasar el ratón o con el teclado, para que el
          personal pueda volver al panel sin cerrar el navegador del quiosco. */}
      <Link
        to="/admin/dashboard"
        aria-label="Salir de la pantalla de mostrador"
        className="fixed top-3 right-3 z-50 w-12 h-12 rounded-2xl bg-brand-sombra text-white flex items-center justify-center opacity-0 hover:opacity-100 focus-visible:opacity-100 transition-opacity"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>
    </div>
  )
}

/** El marco con encabezado de marca sobre azul: logo, título y subtítulo. */
export default function KioscoShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string
  subtitulo?: ReactNode
  children: ReactNode
}) {
  return (
    <KioscoMarco className="bg-brand-azul bg-dots-azul gap-[2.2vh] px-[2.6vh] py-[2.6vh]">
      <header className="shrink-0 flex flex-col gap-[1.6vh]">
        <img
          src="/mados-logo-full.svg"
          alt="Helados Mados"
          width={81}
          height={36}
          className="h-[5vh] w-auto self-start"
        />
        <div className="min-w-0">
          <h1 className="font-heading text-white text-[4vh] leading-none text-balance">{titulo}</h1>
          {subtitulo && (
            <p className="font-subheading text-brand-verde text-[2.4vh] leading-tight mt-[1vh]">
              {subtitulo}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 min-h-0">{children}</main>
    </KioscoMarco>
  )
}
