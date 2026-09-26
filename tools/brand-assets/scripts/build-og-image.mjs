#!/usr/bin/env node
/**
 * Genera `public/og/og-default.png` (1200×630) a partir de `templates/og-default.html`, con las
 * fuentes reales de `node_modules/@fontsource` (no las del sistema — así el render coincide con
 * lo que ve un visitante) y los SVG de marca ya optimizados.
 *
 * La estación se lee de `src/content/negocio.ts` (fuente única del NAP, ver CLAUDE.md) en vez de
 * escribirla a mano aquí, para que este script no pueda quedar desalineado del resto del sitio.
 * Como es un `.ts`, se corre con el loader de `tsx` (`node --import tsx/esm ...`) en vez de sumar
 * un paso de build — este paquete de herramientas es independiente de la instalación raíz.
 *
 * Reejecutar con: cd tools/brand-assets && npm run og-image
 */
import { chromium } from 'playwright-core'
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { NEGOCIO } from '../../../src/content/negocio.ts'

const HERE = import.meta.dirname
const ROOT = path.resolve(HERE, '..', '..', '..')
const FONTSOURCE = path.join(ROOT, 'node_modules', '@fontsource')
const CHROMIUM_PATH =
  'C:/Users/Andres/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'

const WIDTH = 1200
const HEIGHT = 630

async function readSvgInner(file, { stripSize = true } = {}) {
  const raw = await readFile(path.join(ROOT, 'public', file), 'utf8')
  return stripSize ? raw.replace(/^(\s*<svg\b)([^>]*)>/, (_all, tag, attrs) => `${tag}${attrs.replace(/\s(width|height)="[^"]*"/g, '')}>`) : raw
}

/**
 * Devuelve el woff2 como `data:` URI base64. Nunca `file://`: `page.setContent()` deja la página
 * en el origen opaco `about:blank`, y Chromium bloquea que un documento así busque un recurso
 * `file://` — el @font-face falla en silencio (sin request visible, sin error) y el texto cae a
 * la fuente de reserva del sistema (así se coló Comic Sans en vez de Bungee la primera vez). Un
 * `data:` URI no depende del origen del documento, así que siempre resuelve.
 */
async function woff2DataUri(...segments) {
  const buffer = await readFile(path.join(FONTSOURCE, ...segments))
  return `data:font/woff2;base64,${buffer.toString('base64')}`
}

async function main() {
  const template = await readFile(path.join(HERE, '..', 'templates', 'og-default.html'), 'utf8')

  const astronautSvg = await readSvgInner('astronauta_mados_nuevo.svg')
  const logoSvgRaw = await readFile(path.join(ROOT, 'public', 'mados-logo-full.svg'), 'utf8')
  // El logo horizontal se posiciona con la clase .logo (top/left/height fijos en el CSS de la
  // plantilla): se le quita el width/height propio para que sea la clase la que lo dimensione.
  const logoSvg = logoSvgRaw
    .replace(/^(\s*<svg\b)([^>]*)>/, (_all, tag, attrs) => `${tag}${attrs.replace(/\s(width|height)="[^"]*"/g, '')} class="logo">`)

  const kickerText = `Estación ${NEGOCIO.direccion.alcaldia} · ${NEGOCIO.direccion.ciudadCorta}`

  const [bungee400, spaceMono400, spaceMono700] = await Promise.all([
    woff2DataUri('bungee', 'files', 'bungee-latin-400-normal.woff2'),
    woff2DataUri('space-mono', 'files', 'space-mono-latin-400-normal.woff2'),
    woff2DataUri('space-mono', 'files', 'space-mono-latin-700-normal.woff2'),
  ])

  const html = template
    .replace('{{FONT_BUNGEE_400}}', bungee400)
    .replace('{{FONT_SPACE_MONO_400}}', spaceMono400)
    .replace('{{FONT_SPACE_MONO_700}}', spaceMono700)
    .replace('{{ASTRONAUT_SVG}}', `<svg class="astronauta" viewBox="0 0 656.235 814.411">${astronautSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`)
    .replace('{{LOGO_SVG}}', logoSvg)
    .replace('{{KICKER_TEXT}}', kickerText)

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH })
  const page = await browser.newPage()
  await page.setViewportSize({ width: WIDTH, height: HEIGHT })
  await page.setContent(html, { waitUntil: 'networkidle' })
  // `fonts.ready` se resuelve en cuanto cada @font-face TERMINA de intentar cargar, haya
  // funcionado o no — no basta como prueba de éxito, solo de que ya no está pendiente.
  await page.evaluate(() => document.fonts.ready)

  // Prueba dura: si el @font-face de verdad no cargó, `check()` da `false` porque el texto se
  // pintaría con la reserva — y eso es justo lo que pasó la primera vez (Comic Sans en vez de
  // Bungee) sin que nada fallara ruidosamente. Mejor romper el script que publicar la imagen mal.
  const fontChecks = await page.evaluate(() => ({
    bungee: document.fonts.check('400 64px Bungee'),
    spaceMono400: document.fonts.check('400 20px "Space Mono"'),
    spaceMono700: document.fonts.check('700 20px "Space Mono"'),
  }))
  const missing = Object.entries(fontChecks).filter(([, ok]) => !ok).map(([name]) => name)
  if (missing.length) {
    throw new Error(
      `Las fuentes reales no cargaron (cayeron a la reserva del sistema): ${missing.join(', ')}. ` +
        `document.fonts.check() = ${JSON.stringify(fontChecks)}`
    )
  }
  console.log(`✓ fuentes cargadas: ${JSON.stringify(fontChecks)}`)

  const outDir = path.join(ROOT, 'public', 'og')
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, 'og-default.png')
  await page.screenshot({ path: outPath, type: 'png' })
  await browser.close()

  const { size } = await (await import('node:fs/promises')).stat(outPath)
  console.log(`✓ ${outPath} (${(size / 1024).toFixed(1)} KB)`)
  if (size > 300 * 1024) {
    console.warn('⚠ Supera los 300 KB pedidos — revisa la compresión.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
