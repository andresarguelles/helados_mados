#!/usr/bin/env node
/**
 * Genera favicon.svg, favicon.ico (16/32/48), apple-touch-icon.png (180×180) e icon-192/512.png,
 * todos a partir del astronauta ya optimizado, sobre fondo sólido azul de marca #3C5DDC — iOS no
 * respeta transparencia en el apple-touch-icon, y un icono "maskable" transparente se ve roto en
 * cuanto un launcher de Android lo recorta a otra forma, así que el mismo fondo sirve a los dos
 * casos y de paso da consistencia visual entre todos los iconos.
 *
 * icon-192/icon-512 declaran `"purpose": "any maskable"` en `site.webmanifest` (un solo archivo
 * cubre los dos usos, en vez de un tercer PNG "-maskable" aparte): por eso usan el encuadre
 * conservador `MASKABLE_SAFE_WIDTH_FRAC`, que deja el astronauta dentro del círculo de seguridad
 * del 80% que exige la spec de iconos maskable.
 */
import { chromium } from 'playwright-core'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import {
  buildIconSvg,
  MASKABLE_SAFE_WIDTH_FRAC,
  REGULAR_WIDTH_FRAC,
} from './lib/render-icon-svg.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const PUBLIC = path.join(ROOT, 'public')
const CHROMIUM_PATH =
  'C:/Users/Andres/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'

async function renderPng(page, svg, size) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;}svg{display:block;}</style></head><body>${svg}</body></html>`
  )
  return page.screenshot({ type: 'png' })
}

/** Contenedor ICO a mano: ICONDIR + ICONDIRENTRY[] + PNG crudo por cada tamaño (formato PNG
 * embebido, válido desde Windows Vista — evita reimplementar un encoder BMP/DIB). */
function buildIco(pngBuffers) {
  const count = pngBuffers.length
  const headerSize = 6 + count * 16
  let offset = headerSize
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: 1 = icon
  header.writeUInt16LE(count, 4)

  const entries = []
  for (const { size, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0) // width, 0 = 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1) // height, 0 = 256
    entry.writeUInt8(0, 2) // color palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(buffer.length, 8) // size in bytes
    entry.writeUInt32LE(offset, 12) // offset
    offset += buffer.length
    entries.push(entry)
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map((p) => p.buffer)])
}

async function main() {
  await mkdir(PUBLIC, { recursive: true })
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH })
  const page = await browser.newPage()

  // favicon.svg — vectorial, se ve nítido en cualquier tamaño de pestaña.
  const faviconSvg = await buildIconSvg(64, REGULAR_WIDTH_FRAC)
  await writeFile(path.join(PUBLIC, 'favicon.svg'), faviconSvg, 'utf8')
  console.log('✓ favicon.svg')

  // favicon.ico — 16/32/48, PNG embebido.
  const icoSizes = [16, 32, 48]
  const icoBuffers = []
  for (const size of icoSizes) {
    const svg = await buildIconSvg(size, REGULAR_WIDTH_FRAC)
    const buffer = await renderPng(page, svg, size)
    icoBuffers.push({ size, buffer })
  }
  const ico = buildIco(icoBuffers)
  await writeFile(path.join(PUBLIC, 'favicon.ico'), ico)
  console.log(`✓ favicon.ico (${icoSizes.join('/')}px, ${(ico.length / 1024).toFixed(1)} KB)`)

  // apple-touch-icon.png — 180×180, sin transparencia (iOS no la respeta) y sin esquinas
  // redondeadas propias (iOS aplica su propia máscara; redondear aquí duplicaría el recorte).
  const appleSvg = await buildIconSvg(180, REGULAR_WIDTH_FRAC)
  const applePng = await renderPng(page, appleSvg, 180)
  await writeFile(path.join(PUBLIC, 'apple-touch-icon.png'), applePng)
  console.log(`✓ apple-touch-icon.png (180×180, ${(applePng.length / 1024).toFixed(1)} KB)`)

  // icon-192 / icon-512 — "any maskable": lienzo azul de borde a borde, arte dentro del círculo
  // de seguridad del 80%.
  for (const size of [192, 512]) {
    const svg = await buildIconSvg(size, MASKABLE_SAFE_WIDTH_FRAC)
    const png = await renderPng(page, svg, size)
    await writeFile(path.join(PUBLIC, `icon-${size}.png`), png)
    console.log(`✓ icon-${size}.png (${(png.length / 1024).toFixed(1)} KB)`)
  }

  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
