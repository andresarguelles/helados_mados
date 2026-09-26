#!/usr/bin/env node
/**
 * Avisa a IndexNow (Bing, Yandex y quien más lo consuma) de las URLs indexables tras un
 * deploy. Google no participa del protocolo IndexNow; para Google sigue mandando Search
 * Console por su cuenta, como ya está en el plan.
 *
 * Uso:
 *   node scripts/indexnow.mjs --dry-run                         (usa dist/sitemap.xml)
 *   node scripts/indexnow.mjs --dry-run --sitemap <url>          (usa un sitemap remoto)
 *   node scripts/indexnow.mjs                                    (hace el POST de verdad)
 *
 * La clave vive en `public/<clave>.txt` — el mismo archivo que IndexNow verifica sirviéndolo
 * desde el sitio (`keyLocation`). No se pasa por argumento porque es un secreto de sitio, no
 * de invocación: cambia con el archivo, nunca con la llamada.
 *
 * Este script **no** se corre solo: alguien tiene que invocarlo después de que el deploy esté
 * en producción y el sitemap nuevo sea el que se sirve. `--dry-run` es la manera de revisar el
 * payload sin gastar la cuota del endpoint.
 */
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, die } from './lib/db.mjs'

// Mismo dominio que `SITE_URL` en src/content/negocio.ts — un script plano no puede importar
// ese módulo TypeScript, así que si el dominio cambia algún día, cambia en los dos lugares.
const HOST = 'www.heladosmados.com'
const ENDPOINT = 'https://api.indexnow.org/indexnow'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const sitemapIdx = args.indexOf('--sitemap')
const sitemapArg = sitemapIdx !== -1 ? args[sitemapIdx + 1] : null

const ok = msg => console.log(`✓ ${msg}`)

function encontrarClave() {
  const publicDir = path.join(ROOT, 'public')
  const candidata = fs
    .readdirSync(publicDir)
    .find(f => /^[0-9a-f]{32}\.txt$/.test(f))
  if (!candidata) {
    die(
      'No encuentro la clave de IndexNow en public/*.txt.\n\n' +
        '  Debe ser un archivo public/<32 caracteres hex>.txt cuyo contenido sea esa misma clave.'
    )
  }
  const clave = candidata.replace(/\.txt$/, '')
  const contenido = fs.readFileSync(path.join(publicDir, candidata), 'utf8').trim()
  if (contenido !== clave) {
    die(`public/${candidata} no contiene la clave que promete su nombre.`)
  }
  return clave
}

async function leerSitemap() {
  if (sitemapArg) {
    const res = await fetch(sitemapArg)
    if (!res.ok) die(`No pude descargar el sitemap remoto (${res.status}): ${sitemapArg}`)
    return res.text()
  }
  const local = path.join(ROOT, 'dist', 'sitemap.xml')
  if (!fs.existsSync(local)) {
    die(
      `No encuentro ${local}.\n\n` +
        '  Corre "npm run build" primero, o pasa un sitemap remoto con --sitemap <url>.'
    )
  }
  return fs.readFileSync(local, 'utf8')
}

function extraerUrls(xml) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
  if (urls.length === 0) die('El sitemap no tiene ninguna <loc>. ¿Está vacío o mal formado?')
  return urls
}

const clave = encontrarClave()
const xml = await leerSitemap()
const urlList = extraerUrls(xml)

const payload = {
  host: HOST,
  key: clave,
  keyLocation: `https://${HOST}/${clave}.txt`,
  urlList,
}

if (DRY_RUN) {
  console.log(JSON.stringify(payload, null, 2))
  ok(`(dry-run) ${urlList.length} URLs listas para IndexNow, nada enviado`)
  process.exit(0)
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
})

const cuerpo = await res.text()
if (!res.ok) {
  die(`IndexNow respondió ${res.status}:\n${cuerpo}`)
}
ok(`IndexNow aceptó ${urlList.length} URLs (status ${res.status})`)
