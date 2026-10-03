#!/usr/bin/env node
/**
 * Genera `public/sabores/<id>.jpg` para cada sabor de `src/content/sabores.ts`, siempre con la
 * misma forma, luz y encuadre, pintada del `color` del sabor (ver `lib/render-helado.js`). Así
 * las tarjetas de `/admin/flavors` se ven como una serie: lo único que cambia es el color.
 *
 * Dos modos:
 *   - foto: recolorea una foto real de helado neutro. Una base por tipo:
 *     `fuentes/base-leche.*` para los de leche y `fuentes/base-agua.*` para los de agua.
 *   - render: dibuja la superficie por código. Es el respaldo cuando faltan las fotos.
 * Si están las dos fotos se usa foto; `--modo=render|foto` lo fuerza.
 *
 * Foto propia: si existe `fuentes/sabores/<id>.(jpg|png|webp)`, ese sabor usa su propia foto,
 * sin recolorear (solo recortada a 3:2), en cualquier modo. Para los que se ven mejor así.
 *
 * Este script es dueño de `public/sabores/`: borra cualquier .jpg que ya no corresponda a un
 * sabor del catálogo. Las imágenes no se ponen a mano.
 *
 * Además deja una hoja de contactos en `out/sabores-preview-<modo>.png` para revisarlas juntas.
 *
 * Reejecutar con: npm --prefix tools/brand-assets run sabores
 * Solo algunos: ... run sabores -- --solo=vainilla,napolitano
 * Probar sin tocar public/: ... run sabores -- --salida=out/prueba
 * Otras fotos base: ... run sabores -- --fuentes=ruta/a/carpeta
 */
import { chromium } from 'playwright-core'
import { access, mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { SABORES, coloresDe } from '../../../src/content/sabores.ts'

const HERE = import.meta.dirname
const ROOT = path.resolve(HERE, '..', '..', '..')
const PUBLICO = path.join(ROOT, 'public', 'sabores')
const OUT = path.join(HERE, '..', 'out')
const CHROMIUM_PATH =
  'C:/Users/Andres/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'

// 3:2 y de sobra para cualquier tarjeta: la imagen es textura pareja, así que `object-cover`
// puede recortarla a cualquier proporción sin perder nada.
const ANCHO = 960
const ALTO = 640
const SUPERMUESTREO = 2
const CALIDAD_JPEG = 0.82
const EXTENSIONES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

const arg = nombre => process.argv.find(a => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3)

const solo = arg('solo') ? new Set(arg('solo').split(',')) : null
const sabores = solo ? SABORES.filter(s => solo.has(s.id)) : SABORES
if (solo && sabores.length !== solo.size) {
  const conocidos = new Set(SABORES.map(s => s.id))
  throw new Error(`--solo con ids que no existen: ${[...solo].filter(id => !conocidos.has(id)).join(', ')}`)
}
const salida = arg('salida') ? path.resolve(HERE, '..', arg('salida')) : PUBLICO
const fuentes = arg('fuentes') ? path.resolve(arg('fuentes')) : path.join(HERE, '..', 'fuentes')

/** `nombre.(jpg|jpeg|png|webp)` dentro de `carpeta`, en cualquiera de los formatos aceptados. */
async function buscarFoto(carpeta, nombre) {
  for (const ext of Object.keys(EXTENSIONES)) {
    const ruta = path.join(carpeta, `${nombre}${ext}`)
    try { await access(ruta); return ruta } catch { /* sigue con la siguiente extensión */ }
  }
  return null
}

const aDataUrl = async ruta => `data:${EXTENSIONES[path.extname(ruta).toLowerCase()]};base64,${(await readFile(ruta)).toString('base64')}`

const bases = { leche: await buscarFoto(fuentes, 'base-leche'), agua: await buscarFoto(fuentes, 'base-agua') }
const hayFotos = Boolean(bases.leche && bases.agua)
const modo = arg('modo') ?? (hayFotos ? 'foto' : 'render')
if (modo !== 'foto' && modo !== 'render') throw new Error(`--modo=${modo}: usa foto o render`)
if (modo === 'foto' && !hayFotos) {
  throw new Error(`Modo foto sin las dos bases. Se buscan en ${fuentes}: base-leche.(jpg|png|webp) y base-agua.(jpg|png|webp)`)
}
console.log(`modo: ${modo}${modo === 'foto' ? ` (${path.basename(bases.leche)}, ${path.basename(bases.agua)})` : ''}`)

await mkdir(salida, { recursive: true })
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROMIUM_PATH })
try {
  const page = await browser.newPage()
  await page.setContent('<!doctype html><html><body></body></html>')
  await page.addScriptTag({ path: path.join(HERE, 'lib', 'render-helado.js') })

  const t0 = Date.now()
  if (modo === 'foto') {
    for (const [base, ruta] of Object.entries(bases)) {
      const dataUrl = await aDataUrl(ruta)
      const info = await page.evaluate(([c, d, w, h]) => window.HeladoRender.prepararFoto(c, d, w, h), [base, dataUrl, ANCHO, ALTO])
      console.log(`  base ${base}: ${info.ancho}×${info.alto}, mediana ${info.mediana}, brillos hasta ×${info.tope}`)
    }
  } else {
    await page.evaluate(([w, h, s]) => window.HeladoRender.preparar(w, h, s), [ANCHO, ALTO, SUPERMUESTREO])
  }
  console.log(`preparado en ${((Date.now() - t0) / 1000).toFixed(1)} s`)

  const generadas = []
  for (const sabor of sabores) {
    const colores = coloresDe(sabor)
    const propia = await buscarFoto(path.join(fuentes, 'sabores'), sabor.id)
    const dataUrl = propia
      ? await page.evaluate(([d, w, h, q]) => window.HeladoRender.fotoTalCual(d, w, h, q), [await aDataUrl(propia), ANCHO, ALTO, CALIDAD_JPEG])
      : modo === 'foto'
        ? await page.evaluate(([b, c, q]) => window.HeladoRender.pintarFoto(b, c, q), [sabor.base, colores, CALIDAD_JPEG])
        : await page.evaluate(([c, q]) => window.HeladoRender.pintar(c, q), [colores, CALIDAD_JPEG])
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
    await writeFile(path.join(salida, `${sabor.id}.jpg`), buf)
    generadas.push({ sabor, dataUrl, propia: Boolean(propia) })
    console.log(`  ${sabor.id}.jpg  ${(buf.length / 1024).toFixed(0)} KB${propia ? '  (foto propia)' : ''}`)
  }

  // Solo se limpia public/ con el catálogo completo: con --solo faltarían los que no se
  // regeneraron, y una carpeta de prueba no es asunto de este script.
  if (!solo && salida === PUBLICO) {
    const validos = new Set(SABORES.map(s => `${s.id}.jpg`))
    for (const archivo of await readdir(salida)) {
      if (!validos.has(archivo)) {
        await unlink(path.join(salida, archivo))
        console.log(`  borrado: ${archivo}`)
      }
    }
  }

  const celdas = generadas
    .map(({ sabor, dataUrl, propia }) => `<figure><img src="${dataUrl}"><figcaption>${sabor.nombre} · ${sabor.base} · ${propia ? 'foto propia' : coloresDe(sabor).join(' ')}</figcaption></figure>`)
    .join('')
  await page.setViewportSize({ width: 1240, height: 400 })
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;padding:16px;background:#F4F6FB;font:14px sans-serif;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    figure{margin:0}img{width:100%;display:block;border-radius:8px}figcaption{margin-top:4px;color:#1C2440}
  </style></head><body>${celdas}</body></html>`)
  const hoja = path.join(OUT, `sabores-preview-${modo}.png`)
  await page.screenshot({ path: hoja, fullPage: true })
  console.log(`hoja de contactos: ${path.relative(ROOT, hoja)}`)
} finally {
  await browser.close()
}
