/**
 * Aviso de cookies — la barra que hace verdad lo que promete el aviso de privacidad:
 * la medición no se carga hasta que la persona la acepta.
 *
 * Reglas que no son de estilo, son del consentimiento:
 * - Por defecto no se mide. Cerrar, ignorar o no decidir equivale a rechazar.
 * - «Rechazar» y «Aceptar» son el mismo botón con distinto color: mismo tamaño, misma
 *   tipografía, un solo toque cada uno. Si rechazar costara más, esto dejaría de ser
 *   consentimiento libre y volveríamos al problema que la barra viene a resolver.
 * - No bloquea la página: es una barra abajo, sin telón ni foco atrapado.
 *
 * Trato de tú, como el resto de la interfaz (incluida la otra casilla de
 * consentimiento, la de WhatsApp en /bienvenida). El «usted» se queda para los
 * documentos legales, que son documentos y no pantallas.
 */
import { useSyncExternalStore } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, X } from 'lucide-react'
import {
  guardarConsentimiento,
  leerConsentimiento,
  medicionConfigurada,
  suscribirConsentimiento,
  trackPageview,
  type ConsentimientoMedicion,
} from '../../lib/analytics'
import { useBottomNavVisible } from '../layout/BottomNav'
import { useHydrated } from '../../lib/useHydrated'
import { cn } from '../../lib/utils'
import { esRutaKiosco } from '../../lib/kiosco'

// Apertura manual desde el pie de página. Es estado de una sola barra montada en App,
// así que un almacén de módulo basta y evita subir el estado hasta App para nada.
let abiertoAMano = false
const oyentes = new Set<() => void>()

function suscribirApertura(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function leerApertura(): boolean {
  return abiertoAMano
}

function cambiarApertura(valor: boolean) {
  if (abiertoAMano === valor) return
  abiertoAMano = valor
  for (const oyente of oyentes) oyente()
}

/** La usa el Footer para que se pueda cambiar de opinión después. */
export function abrirPreferenciasCookies() {
  cambiarApertura(true)
}

const CLASE_ENLACE = 'text-brand-azul font-bold underline'

export default function CookieBanner() {
  // Sin `getServerSnapshot`, `useSyncExternalStore` LANZA en el servidor (no hay
  // `localStorage` que leer ahí). El valor que se le da —null / cerrado— es además el
  // correcto: en el HTML prerenderizado nunca debe aparecer el banner.
  const consentimiento = useSyncExternalStore(suscribirConsentimiento, leerConsentimiento, () => null)
  const abierto = useSyncExternalStore(suscribirApertura, leerApertura, () => false)
  const hidratado = useHydrated()
  const navVisible = useBottomNavVisible()
  const location = useLocation()

  // La compuerta de hidratación va primero: aunque el snapshot de servidor ya diera
  // `null`/`false`, sin ella el primer render del cliente podría leer el `localStorage`
  // real antes de que React termine de comparar contra el HTML que llegó del servidor,
  // y eso sí es un desajuste de hidratación. Sin ID de medición tampoco hay nada que
  // consentir; con decisión tomada, solo se ve si la persona vuelve a abrirla desde el pie.
  if (!hidratado || !medicionConfigurada()) return null
  if (consentimiento !== null && !abierto) return null
  // En una pantalla de mostrador nadie va a contestar. No preguntar equivale a no medir,
  // que es justo el valor por defecto que promete el aviso.
  if (esRutaKiosco(location.pathname)) return null

  const decidir = (valor: ConsentimientoMedicion) => {
    guardarConsentimiento(valor)
    cambiarApertura(false)
    // La vista actual se perdió mientras la barra estaba en pantalla: al aceptar se
    // manda, porque RouteTracker ya no volverá a dispararse hasta que cambie la ruta.
    if (valor === 'aceptado') trackPageview(location.pathname + location.search)
  }

  return (
    <div
      role="region"
      aria-labelledby="cookie-banner-titulo"
      className={cn(
        'fixed inset-x-0 z-40 px-3 animate-slide-up',
        // Por encima de la navbar inferior cuando está en pantalla; si no, pegada abajo
        // con el hueco del notch.
        navVisible
          ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))]'
          : 'bottom-[calc(0.75rem+env(safe-area-inset-bottom))]'
      )}
    >
      <div className="paper-card mx-auto max-w-lg p-4 flex flex-col gap-2.5">
        <div className="flex items-start gap-2">
          <BarChart3 className="w-4 h-4 text-brand-azul shrink-0 mt-0.5" />
          <h2 id="cookie-banner-titulo" className="font-heading text-brand-sombra text-sm flex-1">
            Cookies de medición
          </h2>
          {/* Solo cuando ya hay una decisión: cerrar sin elegir nada sería una respuesta
              en blanco, y en blanco no se mide, pero tampoco hay por qué esconder la
              pregunta. */}
          {consentimiento !== null && (
            <button
              type="button"
              onClick={() => cambiarApertura(false)}
              aria-label="Cerrar aviso de cookies"
              className="text-brand-gris hover:text-brand-sombra transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="font-body text-brand-gris text-xs leading-relaxed">
          Usamos Google Analytics para ver qué páginas se visitan. Solo se carga si lo
          aceptas, y puedes cambiarlo después desde el pie. Detalles en el{' '}
          <Link to="/privacidad" className={CLASE_ENLACE}>
            Aviso de Privacidad
          </Link>
          .
        </p>

        {consentimiento !== null && (
          <p className="font-mono text-[10px] uppercase tracking-wide text-brand-gris">
            Ahora: medición {consentimiento === 'aceptado' ? 'activada' : 'desactivada'}
          </p>
        )}

        <div className="flex gap-2">
          {/* Rechazar va primero y pesa lo mismo: un toque, sin capas ni «configurar». */}
          <button
            type="button"
            onClick={() => decidir('rechazado')}
            className="btn-tinta flex-1 px-4 py-2.5 text-xs"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => decidir('aceptado')}
            className="btn-fresa flex-1 px-4 py-2.5 text-xs"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
