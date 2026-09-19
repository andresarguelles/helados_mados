#!/usr/bin/env node
/**
 * Compila legal/*.md y escribe los artefactos en LOS DOS repos.
 *
 * Uso:  npm run legal:build
 *       npm run legal:build -- --android ../otra/ruta
 *
 * Genera a medias nunca: si no encuentra el repo de Android, aborta antes de tocar
 * nada. Escribir solo un lado seria crear con las propias manos la divergencia que
 * todo este mecanismo existe para impedir.
 */
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
  sqlVersiones,
  validarConjunto,
} from './lib/legal.mjs'

// ─── Entrada ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const iAndroid = args.indexOf('--android')
const rutaCli = iAndroid === -1 ? null : args[iAndroid + 1]
if (iAndroid !== -1 && !rutaCli) die('--android necesita una ruta.')

// Mientras un documento todavia no se ha publicado, exigir que suba la version en cada
// correccion solo genera numeros de version que no significan nada. Es explicito y avisa,
// porque el candado existe para impedir el descuido, no el cambio deliberado.
const BORRADOR = args.includes('--borrador')

const android = resolverRepoAndroid(rutaCli)
if (!android) die(NO_ENCUENTRO_ANDROID)

// ─── Compilacion ────────────────────────────────────────────────────────────

const docs = cargarDocs()
validarConjunto(docs, leerIconosAndroid(android.ruta))

// La version tiene que subir cuando el texto cambia. Es el candado que impide publicar
// dos textos distintos bajo el mismo numero — y sin numero fiable, el registro de
// aceptacion de cada usuario no prueba nada.
const lockPrevio = leerJson(path.join(ROOT, LOCK))
if (lockPrevio) {
  for (const doc of docs) {
    const antes = lockPrevio.docs?.[doc.id]
    if (antes && antes.astHash !== doc.astHash && antes.version === doc.version) {
      if (!BORRADOR) {
        die(
          `legal/${doc.id}.md cambio pero "version" sigue en ${doc.version}.\n\n` +
            '  Sube la version en el frontmatter antes de regenerar:\n' +
            '    MAYOR  cambia el tratamiento de datos y exige volver a aceptar\n' +
            '    MENOR  nueva finalidad o seccion\n' +
            '    PARCHE redaccion o erratas\n\n' +
            '  Si el documento todavia no se ha publicado y estas iterando el borrador:\n' +
            '    npm run legal:build -- --borrador'
        )
      }
      console.log(
        `⚠ ${doc.id} v${doc.version}: el texto cambio y la version no.\n` +
          '  Vale mientras sea un borrador sin publicar. Antes de publicar, sube la version.'
      )
    }
  }
}

const salidas = [
  [ROOT, SALIDA_TS, emitirTs(docs)],
  [ROOT, SALIDA_TS_SIMPLE, emitirTsSimplificado(docs)],
  [android.ruta, SALIDA_KT, emitirKotlin(docs)],
]

const artefactos = { web: {}, android: {} }
for (const [raiz, rel, contenido] of salidas) {
  const destino = path.join(raiz, rel)
  fs.mkdirSync(path.dirname(destino), { recursive: true })
  fs.writeFileSync(destino, contenido, 'utf8')
  artefactos[raiz === ROOT ? 'web' : 'android'][rel] = sha256(contenido)
}

const lock = construirLock(docs, artefactos)
fs.writeFileSync(path.join(ROOT, LOCK), lock, 'utf8')
fs.writeFileSync(path.join(android.ruta, LOCK), lock, 'utf8')

// ─── Salida ─────────────────────────────────────────────────────────────────

console.log()
for (const doc of docs) {
  const bloques = doc.secciones.reduce((n, s) => n + s.bloques.length, 0)
  console.log(
    `✓ legal/${doc.id}.md  v${doc.version}  ${doc.secciones.length} secciones, ` +
      `${bloques} bloques  #${doc.astHash.slice(0, 7)}`
  )
}
for (const [raiz, rel] of salidas) {
  console.log(`✓ ${raiz === ROOT ? 'web    ' : 'android'}  ${rel}`)
}
console.log(`✓ ${LOCK} escrito en los dos repos`)
console.log(`\n  repo Android: ${android.ruta}\n  (via ${android.origen})`)

if (!lockPrevio || lockPrevio.bundleHash !== JSON.parse(lock).bundleHash) {
  console.log(
    '\n  El texto cambio. Para que el servidor acepte registrar esta version,\n' +
      '  pega esto en una migracion nueva:\n\n' +
      sqlVersiones(docs)
        .split('\n')
        .map((l) => '    ' + l)
        .join('\n')
  )
}
console.log('\n  Commitea LOS DOS repos. Si commiteas solo uno, `npm run legal:check` lo detecta.\n')

function leerJson(f) {
  if (!fs.existsSync(f)) return null
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'))
  } catch {
    return null
  }
}
