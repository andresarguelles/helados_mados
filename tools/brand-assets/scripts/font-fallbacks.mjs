#!/usr/bin/env node
/**
 * Calcula los `@font-face` de reserva con métricas ajustadas (size-adjust, ascent-override,
 * descent-override, line-gap-override) para las 4 familias autohospedadas, y los inyecta en
 * `src/styles/fonts.css` entre los marcadores GENERATED:FALLBACKS.
 *
 * Por qué existe: sin esto, cuando el navegador todavía no descargó el woff2 usa la fuente de
 * reserva genérica (`cursive`/`sans-serif`/`monospace`) con métricas muy distintas a las reales
 * (Bungee cae a `cursive`, por ejemplo) — el texto reflowea al hidratar la fuente real, y eso es
 * el CLS. Una fuente de reserva local (ya instalada en el sistema) con las métricas *ajustadas*
 * para imitar el ascenso/descenso/ancho medio de la fuente real ocupa la misma caja desde el
 * primer paint, así que el cambio de fuente no mueve nada.
 *
 * El cálculo es el mismo que usa `fontaine` (unjs/fontaine, MIT) para su transform de Vite/Nuxt:
 * lee las métricas reales de cada woff2 y de la fuente local del sistema con `@capsizecss/unpack`
 * (via `readMetrics` de fontaine) y aplica la fórmula pública `generateFontFace`. Aquí se invoca
 * ese mismo cálculo directamente (sin el plugin de build) porque el "build" real de la app no debe
 * depender de que este paquete de herramientas esté instalado — el resultado se commitea como CSS
 * plano en `src/styles/fonts.css`.
 *
 * Reejecutar tras cualquier cambio de peso/fuente:
 *   cd tools/brand-assets && npm run font-fallbacks
 */
import { readMetrics, generateFontFace } from 'fontaine'
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const FONTSOURCE = path.join(ROOT, 'node_modules', '@fontsource')
const FONTS_CSS = path.join(ROOT, 'src', 'styles', 'fonts.css')

// Fuente local de Windows que sirve de referencia de métricas para cada fuente de reserva.
// Están instaladas de fábrica en Windows/macOS/Linux (Arial y Courier New se sustituyen por
// Liberation/Arimo/Cousine en Linux, pero comparten métricas casi idénticas por diseño
// — son clones intencionales de las fuentes de Microsoft).
const WINDOWS_FONTS = 'C:/Windows/Fonts'

/** @type {{ id: string; label: string; real: string; realWeight: string; fallbackFamily: string; fallbackFile: string }[]} */
const JOBS = [
  {
    id: 'bungee',
    label: 'Bungee → Bungee Fallback',
    real: path.join(FONTSOURCE, 'bungee', 'files', 'bungee-latin-400-normal.woff2'),
    fallbackFamily: 'Arial Black',
    fallbackFile: path.join(WINDOWS_FONTS, 'ariblk.ttf'),
    fallbackName: 'Bungee Fallback',
    extraLocals: ['Arial'],
  },
  {
    id: 'baloo-2',
    label: 'Baloo 2 → Baloo 2 Fallback',
    real: path.join(FONTSOURCE, 'baloo-2', 'files', 'baloo-2-latin-800-normal.woff2'),
    fallbackFamily: 'Arial',
    fallbackFile: path.join(WINDOWS_FONTS, 'arial.ttf'),
    fallbackName: 'Baloo 2 Fallback',
    extraLocals: [],
  },
  {
    id: 'nunito-sans',
    label: 'Nunito Sans → Nunito Sans Fallback',
    // Se mide con el peso 400 (cuerpo de texto, el uso dominante): es donde el CLS del párrafo
    // se nota, más que en los destacados en 900.
    real: path.join(FONTSOURCE, 'nunito-sans', 'files', 'nunito-sans-latin-400-normal.woff2'),
    fallbackFamily: 'Arial',
    fallbackFile: path.join(WINDOWS_FONTS, 'arial.ttf'),
    fallbackName: 'Nunito Sans Fallback',
    extraLocals: [],
  },
  {
    id: 'space-mono',
    label: 'Space Mono → Space Mono Fallback',
    real: path.join(FONTSOURCE, 'space-mono', 'files', 'space-mono-latin-400-normal.woff2'),
    fallbackFamily: 'Courier New',
    fallbackFile: path.join(WINDOWS_FONTS, 'cour.ttf'),
    fallbackName: 'Space Mono Fallback',
    extraLocals: [],
  },
]

function addExtraLocals(fontFaceCss, extraLocals) {
  if (!extraLocals.length) return fontFaceCss
  const extra = extraLocals.map((name) => `local("${name}")`).join(', ')
  return fontFaceCss.replace(/src: (local\("[^"]+"\));/, (_match, first) => `src: ${first}, ${extra};`)
}

async function main() {
  const blocks = []
  for (const job of JOBS) {
    const [realMetrics, fallbackMetrics] = await Promise.all([
      readMetrics(pathToFileURL(job.real)),
      readMetrics(pathToFileURL(job.fallbackFile)),
    ])
    if (!realMetrics || !fallbackMetrics) {
      throw new Error(`No se pudieron leer métricas para ${job.label}`)
    }
    let css = generateFontFace(realMetrics, {
      name: job.fallbackName,
      font: job.fallbackFamily,
      metrics: fallbackMetrics,
    })
    css = addExtraLocals(css, job.extraLocals)
    blocks.push(`/* ${job.label} — calculado por tools/brand-assets/scripts/font-fallbacks.mjs, no editar a mano */\n${css.trim()}`)
    console.log(`✓ ${job.label}`)
    console.log(css)
  }

  const generated = blocks.join('\n\n')
  const current = await readFile(FONTS_CSS, 'utf8')
  const START = '/* GENERATED:FALLBACKS:START — no editar a mano, ver tools/brand-assets/scripts/font-fallbacks.mjs */'
  const END = '/* GENERATED:FALLBACKS:END */'
  const startIdx = current.indexOf(START)
  const endIdx = current.indexOf(END)
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`No se encontraron los marcadores ${START} / ${END} en ${FONTS_CSS}`)
  }
  const next =
    current.slice(0, startIdx + START.length) +
    '\n\n' +
    generated +
    '\n\n' +
    current.slice(endIdx)
  await writeFile(FONTS_CSS, next, 'utf8')
  console.log(`\nEscrito en ${FONTS_CSS}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
