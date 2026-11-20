#!/usr/bin/env node
/**
 * Guardarraíl del entorno del build (Story 6.8). No escribe nada: lee `dist/` y comprueba que el
 * build es del entorno que pidió `VITE_ENTORNO` (lo mismo que lee vite.config.ts).
 *
 * - Producción: ningún archivo de texto de `dist/` trae el formulario de correo, `signInWithPassword`
 *   (nuestra llamada), la franja ni los rótulos de entorno. Es lo que garantiza que Google sigue
 *   siendo la única entrada en heladosmados.com.
 * - Local o pruebas: `dist/index.html` trae `data-entorno` y el prefijo del título, y el JS trae el
 *   formulario y la llamada.
 *
 * `.signInWithPassword(` es nuestra llamada: supabase-js la define como método (`async signInWithPassword(`,
 * sin punto delante), así que el patrón con punto no se confunde con la librería.
 *
 * Corre al final de `npm run build`. Cada aserción sale con ✓ o ✗; sale con código 1 si hubo algún ✗.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { ROOT } from './lib/db.mjs'

const DIST = path.join(ROOT, 'dist')
const EXTENSIONES = new Set(['.html', '.js', '.mjs', '.css', '.json', '.txt', '.xml', '.map', '.webmanifest'])

const variables = loadEnv('production', ROOT, 'VITE_')
const entorno = variables.VITE_ENTORNO || 'produccion'
if (!['produccion', 'local', 'pruebas'].includes(entorno)) {
  console.error('\n✖ VITE_ENTORNO debe ser local, pruebas o produccion.\n')
  process.exit(1)
}
if (!fs.existsSync(DIST)) {
  console.error('\n✖ No existe dist/: corre primero el build.\n')
  process.exit(1)
}

let fallos = 0

function verificar(titulo, problemas) {
  if (problemas.length === 0) {
    console.log(`✓ ${titulo}`)
    return
  }
  fallos++
  console.log(`✗ ${titulo}`)
  for (const p of problemas) console.log(`    - ${p}`)
}

function archivos(dir) {
  const salida = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name)
    if (e.isDirectory()) salida.push(...archivos(ruta))
    else if (EXTENSIONES.has(path.extname(e.name).toLowerCase())) salida.push(ruta)
  }
  return salida
}

const textos = archivos(DIST).map(ruta => ({
  rel: path.relative(DIST, ruta).split(path.sep).join('/'),
  texto: fs.readFileSync(ruta, 'utf8'),
}))

console.log(`entorno:check — entorno esperado: ${entorno}`)

if (entorno === 'produccion') {
  const prohibidas = [
    '.signInWithPassword(',
    'Entrar con correo',
    'Correo o contraseña incorrectos',
    'pruebas.test',
    '[LOCAL]',
    '[PRUEBAS]',
    'data-entorno',
    'franja-entorno',
  ]
  for (const frase of prohibidas) {
    const donde = textos.filter(t => t.texto.includes(frase)).map(t => t.rel)
    verificar(`producción: ningún archivo de dist/ trae «${frase}»`, donde.map(r => `${r} la trae`))
  }
} else {
  const rotulo = entorno === 'local' ? '[LOCAL] ' : '[PRUEBAS] '
  const index = textos.find(t => t.rel === 'index.html')?.texto ?? ''
  verificar(`${entorno}: dist/index.html trae data-entorno="${entorno}"`,
    index.includes(`data-entorno="${entorno}"`) ? [] : ['falta el atributo en <html>'])
  verificar(`${entorno}: el título de dist/index.html empieza con «${rotulo}»`,
    index.includes(`<title data-seo="title">${rotulo}`) || index.includes(`<title>${rotulo}`)
      ? [] : ['falta el prefijo en <title>'])
  const js = textos.filter(t => t.rel.endsWith('.js'))
  for (const frase of ['.signInWithPassword(', 'Entrar con correo']) {
    verificar(`${entorno}: algún .js trae «${frase}»`,
      js.some(t => t.texto.includes(frase)) ? [] : ['ningún .js la trae'])
  }
}

if (fallos > 0) {
  console.error(`\n✖ entorno:check: ${fallos} comprobación(es) fallaron.\n`)
  process.exit(1)
}
console.log('✓ entorno:check en verde')
