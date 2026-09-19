#!/usr/bin/env node
/**
 * Verifica que el texto legal no derivo. No escribe nada.
 *
 * Uso:  npm run legal:check            (lo que corre `prebuild`)
 *       npm run legal:check -- --cross (ademas compara con el repo Android y su git)
 *
 * Sin el repo de Android delante sigue verificando casi todo, porque el lock guarda
 * tambien los hashes de los artefactos del otro repo. Eso es lo que permite que el
 * build de Vercel —que solo ve este repo— detecte igualmente una edicion a mano del
 * Kotlin generado. Con LEGAL_STRICT=1, no encontrarlo es fatal.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, die } from './lib/db.mjs'
import {
  LOCK,
  NO_ENCUENTRO_ANDROID,
  SALIDA_KT,
  SALIDA_TS,
  SALIDA_TS_SIMPLE,
  cargarDocs,
  construirLock,
  emitirKotlin,
  emitirTs,
  emitirTsSimplificado,
  leerIconosAndroid,
  resolverRepoAndroid,
  sha256,
  validarConjunto,
} from './lib/legal.mjs'

const CROSS = process.argv.includes('--cross')
const ESTRICTO = process.env.LEGAL_STRICT === '1'

const ok = (msg) => console.log(`✓ ${msg}`)
const aviso = (msg) => console.log(`⚠ ${msg}`)

const REGENERA = '\n\n  Corre:  npm run legal:build'

// ─── El texto compila ───────────────────────────────────────────────────────

const docs = cargarDocs()
const android = resolverRepoAndroid(null)

if (android) {
  validarConjunto(docs, leerIconosAndroid(android.ruta))
} else if (ESTRICTO) {
  die(NO_ENCUENTRO_ANDROID)
}

console.log()
for (const doc of docs) {
  const bloques = doc.secciones.reduce((n, s) => n + s.bloques.length, 0)
  ok(
    `legal/${doc.id}.md → AST  (${doc.secciones.length} secciones, ${bloques} bloques)  ` +
      `#${doc.astHash.slice(0, 7)}`
  )
}

// ─── Los artefactos coinciden con el texto ──────────────────────────────────

const esperados = [
  [ROOT, SALIDA_TS, emitirTs(docs)],
  [ROOT, SALIDA_TS_SIMPLE, emitirTsSimplificado(docs)],
]
if (android) esperados.push([android.ruta, SALIDA_KT, emitirKotlin(docs)])

for (const [raiz, rel, contenido] of esperados) {
  const destino = path.join(raiz, rel)
  if (!fs.existsSync(destino)) die(`falta el artefacto generado ${rel}${REGENERA}`)
  if (fs.readFileSync(destino, 'utf8') !== contenido) {
    die(
      `${rel} no corresponde al texto de legal/.\n\n` +
        '  O editaste el archivo generado a mano (no se hace: se regenera), o cambiaste\n' +
        '  el .md y no regeneraste.' +
        REGENERA
    )
  }
}
ok('artefactos web coinciden con legal/')
if (android) ok('artefactos android coinciden con legal/')

// ─── El lock ────────────────────────────────────────────────────────────────

const lockLocal = path.join(ROOT, LOCK)
if (!fs.existsSync(lockLocal)) die(`falta ${LOCK}${REGENERA}`)
const lockDisco = fs.readFileSync(lockLocal, 'utf8')
const lockPrevio = JSON.parse(lockDisco)

// Los hashes de los artefactos android salen del lock cuando no tenemos el repo
// delante: asi se sigue detectando que alguien los edito, sin poder leerlos.
const artefactos = { web: {}, android: lockPrevio.artefactos?.android ?? {} }
for (const [raiz, rel, contenido] of esperados) {
  artefactos[raiz === ROOT ? 'web' : 'android'][rel] = sha256(contenido)
}
if (construirLock(docs, artefactos) !== lockDisco) {
  die(`${LOCK} no corresponde al texto de legal/.${REGENERA}`)
}
ok(`${LOCK} corresponde al texto`)

if (!android) {
  aviso('repo Android no encontrado: no puedo comparar su copia (LEGAL_STRICT=1 lo vuelve fatal)')
  console.log()
  process.exit(0)
}

const lockAndroid = path.join(android.ruta, LOCK)
if (!fs.existsSync(lockAndroid)) die(`el repo Android no tiene ${LOCK}${REGENERA}`)
if (fs.readFileSync(lockAndroid, 'utf8') !== lockDisco) {
  die(
    `los dos ${LOCK} difieren: los repos estan en versiones distintas del texto legal.\n\n` +
      `  web:     ${ROOT}\n  android: ${android.ruta}` +
      REGENERA
  )
}
ok(`${LOCK} identico en los dos repos`)

if (!CROSS) {
  console.log()
  process.exit(0)
}

// ─── Nada legal sin commitear ───────────────────────────────────────────────

const sucios = [
  ['web', ROOT, ['legal', SALIDA_TS, SALIDA_TS_SIMPLE, LOCK]],
  ['android', android.ruta, [SALIDA_KT, LOCK]],
].flatMap(([nombre, raiz, rutas]) => {
  const res = spawnSync('git', ['status', '--porcelain', '--', ...rutas], {
    cwd: raiz,
    encoding: 'utf8',
  })
  if (res.error || res.status !== 0) return []
  const lineas = res.stdout.split(/\r?\n/).filter((l) => l.trim())
  return lineas.length ? [[nombre, lineas]] : []
})

if (sucios.length) {
  die(
    'hay cambios legales sin commitear:\n\n' +
      sucios
        .map(([nombre, lineas]) => `  ${nombre}:\n` + lineas.map((l) => `    ${l}`).join('\n'))
        .join('\n\n') +
      '\n\n  Commitea LOS DOS repos: si solo commiteas uno, quien clone vera textos distintos.'
  )
}
ok('sin cambios legales sin commitear en ninguno de los dos repos')
console.log()
