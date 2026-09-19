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
// Lo que corre `prebuild`: el texto tiene que estar en condiciones de publicarse.
const PUBLICABLE = process.argv.includes('--publicable')

const ok = (msg) => console.log(`✓ ${msg}`)
const aviso = (msg) => console.log(`⚠ ${msg}`)

const REGENERA = '\n\n  Corre:  npm run legal:build'

/**
 * Los artefactos se emiten con LF y sus hashes se calculan sobre eso, pero en Windows
 * git puede dejarlos en el disco con CRLF. Sin esto, un clon nuevo daria falsa alarma
 * en todas las comprobaciones. `.gitattributes` tambien lo fija; esto es el cinturon.
 */
const leerLf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')

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

// ─── Nada a medio llenar sale a produccion ──────────────────────────────────

// Los marcadores «PENDIENTE» se pintan LITERALMENTE en la pagina: son datos del
// responsable que solo el dueno puede dar. Un aviso de privacidad que dice
// «PENDIENTE: RFC» donde deberia ir el RFC no identifica al responsable, que es
// justo lo que la ley exige que haga.
//
// Por eso esto tumba `npm run build` (produccion) pero no `npm run dev`: se puede
// seguir trabajando con el borrador, no se puede desplegarlo.
const pendientes = docs.flatMap((doc) => {
  const crudo = fs.readFileSync(path.join(ROOT, 'legal', `${doc.id}.md`), 'utf8')
  return [...crudo.matchAll(/«PENDIENTE:[^»]*»/g)].map((m) => `${doc.id}.md — ${m[0]}`)
})

if (pendientes.length) {
  const lista = [...new Set(pendientes)].map((p) => `    ${p}`).join('\n')
  if (PUBLICABLE && process.env.LEGAL_PERMITIR_PENDIENTES !== '1') {
    die(
      `el texto legal tiene ${pendientes.length} marcadores sin llenar:\n\n${lista}\n\n` +
        '  Se pintan tal cual en la pagina. Un aviso que no identifica al responsable\n' +
        '  no cumple, asi que esto no se despliega.\n\n' +
        '  Llenalos en legal/*.md, corre `npm run legal:build` y vuelve a intentar.\n' +
        '  Para construir igualmente (no lo subas): LEGAL_PERMITIR_PENDIENTES=1 npm run build'
    )
  }
  aviso(
    `${pendientes.length} marcadores «PENDIENTE» sin llenar ` +
      `(tumban "npm run build"):\n${lista}`
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
  if (leerLf(destino) !== contenido) {
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
const lockDisco = leerLf(lockLocal)
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
if (leerLf(lockAndroid) !== lockDisco) {
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
