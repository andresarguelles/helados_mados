#!/usr/bin/env node
/**
 * Genera `public/sabores/<id>.jpg` para cada sabor de `src/content/sabores.ts`: la superficie
 * de un helado vista de frente, siempre con la misma forma, luz y encuadre, pintada del
 * `color` del sabor (ver `lib/render-helado.js`). Así las tarjetas de `/admin/flavors` se ven
 * como una serie: lo único que cambia de una a otra es el color.
 *
 * Este script es dueño de `public/sabores/`: borra cualquier .jpg que ya no corresponda a un
 * sabor del catálogo. Las imágenes no se ponen a mano.
 *
 * Además deja una hoja de contactos en `out/sabores-preview.png` para revisarlas juntas.
 *
 * Reejecutar con: npm --prefix tools/brand-assets run sabores
 * Solo algunos (para ajustar el render): ... run sabores -- --solo=vainilla,napolitano
 */
import { chromium } from 'playwright-core'
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { SABORES, coloresDe } from '../../../src/content/sabores.ts'

const HERE = import.meta.dirname
const ROOT = path.resolve(HERE, '..', '..', '..')
const SALIDA = path.join(ROOT, 'public', 'sabores')
const OUT = path.join(HERE, '..', 'out')
const CHROMIUM_PATH =
  'C:/Users/Andres/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'

// 3:2 y de sobra para cualquier tarjeta: la imagen es textura pareja, así que `object-cover`
// puede recortarla a cualquier proporción sin perder nada.
const ANCHO = 960
const ALTO = 640
const SUPERMUESTREO = 2
const CALIDAD_JPEG = 0.82

const soloArg = process.argv.find(a => a.startsWith('--solo='))
const solo = soloArg ? new Set(soloArg.slice('--solo='.length).split(',')) : null
const sabores = solo ? SABORES.filter(s => solo.has(s.id)) : SABORES
if (solo && sabores.length !== solo.size) {
  const conocidos = new Set(SABORES.map(s => s.id))
  throw new Error(`--solo con ids que no existen: ${[...solo].filter(id => !conocidos.has(id)).join(', ')}`)
}

await mkdir(SALIDA, { recursive: true })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROMIUM_PATH })
try {
  const page = await browser.newPage()
  await page.setContent('<!doctype html><html><body></body></html>')
  await page.addScriptTag({ path: path.join(HERE, 'lib', 'render-helado.js') })

  const t0 = Date.now()
  await page.evaluate(([w, h, s]) => window.HeladoRender.preparar(w, h, s), [ANCHO, ALTO, SUPERMUESTREO])
  console.log(`relieve y luz: ${((Date.now() - t0) / 1000).toFixed(1)} s`)

  const generadas = []
  for (const sabor of sabores) {
    const dataUrl = await page.evaluate(([c, q]) => window.HeladoRender.pintar(c, q), [coloresDe(sabor), CALIDAD_JPEG])
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
    await writeFile(path.join(SALIDA, `${sabor.id}.jpg`), buf)
    generadas.push({ sabor, dataUrl })
    console.log(`  ${sabor.id}.jpg  ${(buf.length / 1024).toFixed(0)} KB`)
  }

  // Con --solo no se limpia: faltarían los que no se regeneraron.
  if (!solo) {
    const validos = new Set(SABORES.map(s => `${s.id}.jpg`))
    for (const archivo of await readdir(SALIDA)) {
      if (!validos.has(archivo)) {
        await unlink(path.join(SALIDA, archivo))
        console.log(`  borrado: ${archivo}`)
      }
    }
  }

  const celdas = generadas
    .map(({ sabor, dataUrl }) => `<figure><img src="${dataUrl}"><figcaption>${sabor.nombre} · ${coloresDe(sabor).join(' ')}</figcaption></figure>`)
    .join('')
  await page.setViewportSize({ width: 1240, height: 400 })
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:16px;background:#F4F6FB;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    figure{margin:0}img{width:100%;display:block;border-radius:8px}figcaption{margin-top:4px;color:#1C2440}
  </style></head><body>${celdas}</body></html>`)
  await page.screenshot({ path: path.join(OUT, 'sabores-preview.png'), fullPage: true })
  console.log(`hoja de contactos: ${path.relative(ROOT, path.join(OUT, 'sabores-preview.png'))}`)
} finally {
  await browser.close()
}
