/**
 * El AST del texto legal. Es el contrato entre el generador (`scripts/lib/legal.mjs`)
 * y los dos renderers, y tiene un gemelo exacto en Kotlin:
 * `app/src/main/java/com/heladosmados/app/legal/LegalModel.kt` del repo Android.
 *
 * Si cambia uno, cambian los tres. El `never` del renderer y el `when` exhaustivo de
 * Kotlin estan ahi para que ampliar el modelo sin ampliar un renderer no compile:
 * el hash prueba que los datos son iguales, pero no que los dos lados los pinten.
 */
import type { LucideIcon } from 'lucide-react'

/**
 * A que plataforma se refiere un bloque.
 *
 * NO es una condicion de visibilidad: un bloque `web` se muestra tambien en Android,
 * con una etiqueta que dice que alli no aplica, y al reves. Ver `legal/README.md`.
 */
export type LegalAlcance = 'ambas' | 'web' | 'android'

export type LegalSpan =
  | { t: 'texto'; v: string }
  | { t: 'fuerte'; v: string }
  | { t: 'enlace'; v: string; href: string }
  | { t: 'enlaceLegal'; v: string; doc: string }

export type LegalBloque =
  | { tipo: 'parrafo'; alcance: LegalAlcance; spans: LegalSpan[] }
  | { tipo: 'lista'; alcance: LegalAlcance; items: LegalSpan[][] }

export interface LegalSeccion {
  /** Ancla estable: es una URL que alguien puede citar. */
  id: string
  titulo: string
  icono: LucideIcon
  /** `'simplificado'` marca el aviso corto del punto de recoleccion. */
  rol: string | null
  bloques: LegalBloque[]
}

export interface LegalDoc {
  id: string
  titulo: string
  icono: LucideIcon
  /** Semver. Una MAYOR nueva obliga a volver a aceptar. */
  version: string
  /** AAAA-MM-DD. */
  actualizado: string
  /** sha256 del AST canonico. Los 7 primeros caracteres se pintan al pie. */
  astHash: string
  secciones: LegalSeccion[]
}

/** `v2.0.0 · 18 de septiembre de 2026 · #a1b2c3d` — la linea que se compara a ojo. */
export function pieDeVersion(doc: LegalDoc): string {
  const [a, m, d] = doc.actualizado.split('-').map(Number)
  const meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  return `v${doc.version} · ${d} de ${meses[m - 1]} de ${a} · #${doc.astHash.slice(0, 7)}`
}

export const ETIQUETA_ALCANCE: Record<Exclude<LegalAlcance, 'ambas'>, string> = {
  web: 'Solo en el sitio web',
  android: 'Solo en la aplicación Android',
}
