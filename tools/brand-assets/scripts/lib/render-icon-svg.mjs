/**
 * Arma el marcado del icono (astronauta centrado sobre un cuadrado azul de marca) que reutilizan
 * `build-icons.mjs` (favicon.svg / favicon.ico / apple-touch-icon.png / icon-192 / icon-512) y
 * `build-og-image.mjs` no lo usa (esa plantilla es propia, con el logo horizontal).
 *
 * `widthFrac` decide cuánto del lienzo ocupa el astronauta: los iconos "maskable" (icon-192,
 * icon-512) necesitan que el arte quepa en el círculo central del 80% que exige la especificación
 * — de ahí el valor conservador `MASKABLE_SAFE_WIDTH_FRAC`. El favicon y el apple-touch-icon no
 * son maskable (no los recorta un launcher de Android), así que pueden usar más lienzo para
 * seguir siendo legibles a 16-48px.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const ASTRONAUT_PATH = path.join(import.meta.dirname, '..', '..', '..', '..', 'public', 'astronauta_mados_nuevo.svg')
const BRAND_AZUL = '#3C5DDC'

// Rectángulo inscrito en el círculo de seguridad del 80% (spec de iconos maskable), calculado a
// partir de la relación de aspecto real del astronauta (656.235 × 814.411).
export const MASKABLE_SAFE_WIDTH_FRAC = 0.5
export const REGULAR_WIDTH_FRAC = 0.72

let astronautInnerCache
async function getAstronautInner() {
  if (astronautInnerCache) return astronautInnerCache
  const raw = await readFile(ASTRONAUT_PATH, 'utf8')
  const viewBoxMatch = raw.match(/viewBox="([\d.\-\s]+)"/)
  const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
  if (!viewBoxMatch || !innerMatch) throw new Error('No se pudo leer el astronauta optimizado')
  const [, , w, h] = viewBoxMatch[1].trim().split(/\s+/).map(Number)
  astronautInnerCache = { inner: innerMatch[1], w, h, aspect: w / h }
  return astronautInnerCache
}

/**
 * @param {number} size - lado del cuadrado, en las unidades del viewBox resultante (px lógicos).
 * @param {number} widthFrac - fracción del lienzo que ocupa el ancho del astronauta.
 * @param {{ background?: string }} [opts]
 * @returns {Promise<string>} SVG completo, listo para escribir a disco o inyectar en HTML.
 */
export async function buildIconSvg(size, widthFrac, opts = {}) {
  const { background = BRAND_AZUL } = opts
  const { inner, aspect } = await getAstronautInner()
  const artWidth = size * widthFrac
  const artHeight = artWidth / aspect
  const x = (size - artWidth) / 2
  const y = (size - artHeight) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${artWidth.toFixed(2)}" height="${artHeight.toFixed(2)}" viewBox="0 0 656.235 814.411">${inner}</svg>
</svg>`
}
