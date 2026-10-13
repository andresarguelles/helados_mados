/**
 * Lo que cambió en cada versión, contado en corto para la compuerta de re-aceptación.
 *
 * NO es texto legal: no entra al AST ni al hash, y lo que vale es el documento. Es la forma de
 * que quien ya tiene cuenta se entere de qué cambió sin leerse los dos textos, así que cada
 * entrada tiene que ser fiel al `.md` de esa versión.
 *
 * Va por versión de documento (`id@version`) porque la compuerta solo sabe qué documentos tiene
 * pendientes. Cuando una novedad toca a los dos, se repite en ambos y se muestra una vez.
 *
 * Android tiene el mismo texto en `LegalGateStrings.kt`: cambia en uno, cambia en el otro.
 */
import { LEGAL_META } from './generated/legalMeta'

interface Novedad {
  /** La gran noticia: va arriba y destacada. */
  titular?: string
  puntos: string[]
}

const WHATSAPP_OPCIONAL =
  'Tu WhatsApp ya es opcional. Y si nos lo diste, ahora puedes cambiarlo o borrarlo tú mismo desde tu perfil, cuando quieras.'

const NOVEDADES: Record<string, Novedad> = {
  'privacidad@4.0.0': {
    titular: WHATSAPP_OPCIONAL,
    puntos: ['Para tu cumpleaños solo te pedimos día y mes, y borramos el año de las fechas que ya teníamos.'],
  },
  'privacidad@4.1.0': {
    puntos: [
      'Sacamos estadísticas internas de la promoción —canjes, horarios, dinámicas— para mejorarla. Son cifras de conjunto: no te identifican.',
      'Podemos ofrecerte promociones según cómo participas. Si no quieres, escríbenos y dejas de aparecer en esas listas.',
    ],
  },
  'terminos@3.0.0': {
    titular: WHATSAPP_OPCIONAL,
    puntos: ['Ya no damos puntos por registrarte ni por llenar tus datos: toda cuenta nueva empieza en cero. Los que ya ganaste se quedan.'],
  },
}

/** Las novedades de las versiones vigentes de los documentos pendientes, sin repetir. */
export function novedadesDe(pendientes: string[]): { titular: string | null; puntos: string[] } {
  const entradas = pendientes
    .map((id) => NOVEDADES[`${id}@${LEGAL_META[id]?.version}`])
    .filter((n): n is Novedad => n !== undefined)

  return {
    titular: entradas.find((n) => n.titular)?.titular ?? null,
    puntos: [...new Set(entradas.flatMap((n) => n.puntos))],
  }
}
