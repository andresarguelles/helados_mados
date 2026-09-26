#!/usr/bin/env node
/**
 * Prueba de fidelidad obligatoria antes de aplicar la optimización de SVG (ver
 * `optimize-svgs.mjs`): renderiza el original y el optimizado al mismo tamaño con el Chromium
 * ya instalado por Playwright (no descarga nada nuevo) y compara píxel a píxel con pixelmatch.
 *
 * Se ignoran los atributos `width`/`height` de la etiqueta raíz al renderizar (Inkscape los deja
 * en cm, y svgo los puede reordenar) para que el tamaño de ambos renders salga solo del
 * `viewBox` — el mismo dato que usa A4 para las `<img>`, así que es la comparación que importa.
 */
import { chromium } from 'playwright-core'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const HERE = import.meta.dirname
const ROOT = path.resolve(HERE, '..', '..', '..')
const OUT = path.join(HERE, '..', 'out')
const CHROMIUM_PATH =
  'C:/Users/Andres/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'

const FILES = ['mados-logo-full.svg', 'oficial_letter_logo.svg', 'astronauta_mados_nuevo.svg']
const RENDER_WIDTH = 1600

function stripRootSize(svg) {
  return svg.replace(/^(\s*<svg\b)([^>]*)>/, (_all, tag, attrs) => {
    const cleaned = attrs.replace(/\s(width|height)="[^"]*"/g, '')
    return `${tag}${cleaned}>`
  })
}

function readViewBox(svg) {
  const match = svg.match(/viewBox="([\d.\-\s]+)"/)
  if (!match) throw new Error('No se encontró viewBox')
  const [, , w, h] = match[1].trim().split(/\s+/).map(Number)
  return { w, h }
}

function htmlFor(svg) {
  const stripped = stripRootSize(svg)
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#ffffff;}
  svg{display:block;width:${RENDER_WIDTH}px;height:auto;}
</style></head>
<body>${stripped}</body></html>`
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH })
  const page = await browser.newPage()

  const rows = []
  for (const file of FILES) {
    const beforePath = path.join(OUT, `${file}.before.svg`)
    const afterPath = path.join(OUT, `${file}.after.svg`)
    const [before, after] = await Promise.all([
      readFile(beforePath, 'utf8'),
      readFile(afterPath, 'utf8'),
    ])
    const { w, h } = readViewBox(before)
    const renderHeight = Math.round((RENDER_WIDTH * h) / w)
    await page.setViewportSize({ width: RENDER_WIDTH, height: renderHeight })

    await page.setContent(htmlFor(before))
    const beforePng = await page.screenshot({ type: 'png' })
    await page.setContent(htmlFor(after))
    const afterPng = await page.screenshot({ type: 'png' })

    await writeFile(path.join(OUT, `${file}.before.png`), beforePng)
    await writeFile(path.join(OUT, `${file}.after.png`), afterPng)

    const img1 = PNG.sync.read(beforePng)
    const img2 = PNG.sync.read(afterPng)
    const { width, height } = img1
    if (img2.width !== width || img2.height !== height) {
      throw new Error(`${file}: tamaños de render distintos (${width}x${height} vs ${img2.width}x${img2.height})`)
    }
    const diff = new PNG({ width, height })
    const diffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, {
      threshold: 0.1,
    })
    await writeFile(path.join(OUT, `${file}.diff.png`), PNG.sync.write(diff))

    const totalPixels = width * height
    const pct = (diffPixels / totalPixels) * 100
    rows.push({ file, diffPixels, totalPixels, pct })
    console.log(
      `${file}: ${diffPixels} px distintos de ${totalPixels} (${pct.toFixed(4)}%) — ` +
        `diff en out/${file}.diff.png`
    )
  }

  await browser.close()

  const worst = Math.max(...rows.map((r) => r.pct))
  console.log(
    worst < 0.05
      ? '\n✓ Fidelidad OK (<0.05% de píxeles distintos en los tres SVG).'
      : '\n⚠ Diferencia visible — revisa out/*.diff.png antes de aplicar --write.'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
