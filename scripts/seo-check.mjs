#!/usr/bin/env node
/**
 * Guardarraíl del SEO técnico. No escribe nada: solo lee `dist/`, `vercel.json` y el
 * manifiesto (importado de `dist-ssr/entry-server.js`, que A1 reexporta desde
 * `src/entry-server.tsx`), y rompe el build si algo se desalineó.
 *
 * Corre como parte de `npm run build` (después del prerender). Cada aserción se imprime
 * con ✓ o ✗; al final sale con código 1 si hubo algún ✗, listando TODOS los fallos, no
 * solo el primero — un solo `npm run build` tiene que decir todo lo que está mal de un jalón.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from './lib/db.mjs'

const DIST = path.join(ROOT, 'dist')
const ENTRY_SSR = path.join(ROOT, 'dist-ssr', 'entry-server.js')
const VERCEL_JSON = path.join(ROOT, 'vercel.json')

let fallos = 0
let checks = 0

function ok(msg) {
  checks++
  console.log(`✓ ${msg}`)
}

/** `problemas`: array de strings. Vacío = pasa; si no, imprime uno por línea y cuenta un solo ✗. */
function verificar(titulo, problemas) {
  checks++
  if (problemas.length === 0) {
    console.log(`✓ ${titulo}`)
    return
  }
  fallos++
  console.log(`✗ ${titulo}`)
  for (const p of problemas) console.log(`    - ${p}`)
}

function die(msg) {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

// ─── Carga del manifiesto (compilado por A1 a dist-ssr/entry-server.js) ───────────────

if (!fs.existsSync(ENTRY_SSR)) {
  die(
    `No encuentro ${path.relative(ROOT, ENTRY_SSR)}.\n\n` +
      '  Este chequeo corre después de "vite build --ssr src/entry-server.tsx --outDir dist-ssr"\n' +
      '  (ver npm run build). Sin ese módulo no hay de dónde leer SEO_ROUTES ni appRoutePaths.'
  )
}
if (!fs.existsSync(DIST)) {
  die(`No encuentro ${path.relative(ROOT, DIST)}. Corre "npm run build:client" y el prerender primero.`)
}

const mod = await import(pathToFileURL(ENTRY_SSR).href)
const {
  SEO_ROUTES,
  NOT_FOUND,
  SPA_SHELL,
  SITE_URL,
  outputFileFor,
  buildSitemapXml,
  appRoutePaths,
} = mod

if (!Array.isArray(SEO_ROUTES) || !NOT_FOUND || !SPA_SHELL || !SITE_URL || !appRoutePaths) {
  die(
    'dist-ssr/entry-server.js no reexporta todo lo que espera este chequeo ' +
      '(SEO_ROUTES, NOT_FOUND, SPA_SHELL, SITE_URL, outputFileFor, buildSitemapXml, appRoutePaths).'
  )
}

const TODAS = [...SEO_ROUTES, NOT_FOUND]

// ─── Utilidades ────────────────────────────────────────────────────────────────────────

function leer(rel) {
  return fs.readFileSync(path.join(DIST, rel), 'utf8')
}

function existeEnDist(rel) {
  return fs.existsSync(path.join(DIST, rel))
}

function listarHtml(dir) {
  const out = []
  for (const nombre of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, nombre.name)
    if (nombre.isDirectory()) out.push(...listarHtml(full))
    else if (nombre.name.endsWith('.html')) out.push(full)
  }
  return out
}

function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function codePoints(s) {
  return [...s].length
}

function contarOcurrencias(html, regex) {
  return [...html.matchAll(regex)].length
}

/** El bloque `<div id="root" ...>...</div>` justo antes de `</body>`. */
function extraerRoot(html) {
  const m = html.match(/<div id="root"([^>]*)>([\s\S]*)<\/div>\s*<\/body>/)
  if (!m) return null
  return { attrs: m[1], inner: m[2] }
}

function atributo(attrsStr, nombre) {
  const m = attrsStr.match(new RegExp(`${nombre}="([^"]*)"`))
  return m ? m[1] : null
}

function contenidoMeta(html, nombreOProp, valor) {
  const re = new RegExp(`<meta[^>]*(?:name|property)="${valor}"[^>]*content="([^"]*)"`, 'i')
  const m = html.match(re)
  return m ? decodeEntities(m[1]) : null
}

/** Assets locales (`href`/`content` que empiezan por `/` o por SITE_URL) que el HTML referencia. */
function assetsReferenciados(html) {
  const rutas = new Set()
  for (const m of html.matchAll(/\s(?:href|content)="([^"]+)"/g)) {
    let rel = null
    if (m[1].startsWith(SITE_URL)) rel = m[1].slice(SITE_URL.length)
    else if (m[1].startsWith('/') && !m[1].startsWith('//')) rel = m[1]
    if (rel && /\.(png|ico|svg|webmanifest|jpg|jpeg|webp|json)(\?.*)?$/i.test(rel)) {
      rutas.add(rel.split('?')[0])
    }
  }
  return [...rutas]
}

// ─── 1. Paridad de rutas ───────────────────────────────────────────────────────────────

{
  const enManifiesto = new Set(TODAS.map(r => r.path))
  const enApp = new Set(appRoutePaths)
  const faltanEnManifiesto = [...enApp].filter(p => !enManifiesto.has(p))
  const faltanEnApp = [...enManifiesto].filter(p => !enApp.has(p))
  const problemas = []
  if (faltanEnManifiesto.length)
    problemas.push(`hay <Route> sin entrada en SEO_ROUTES: ${faltanEnManifiesto.join(', ')}`)
  if (faltanEnApp.length)
    problemas.push(`SEO_ROUTES tiene rutas que no son ningún <Route>: ${faltanEnApp.join(', ')}`)
  verificar('paridad appRoutePaths ↔ SEO_ROUTES', problemas)
}

// ─── 2. Cada prerender: archivo, #root, marcas de hidratación, un solo h1 ──────────────

const PRERENDER_PAGINAS = SEO_ROUTES.filter(r => r.kind === 'prerender')

for (const route of PRERENDER_PAGINAS) {
  const rel = outputFileFor(route)
  const problemas = []
  if (!existeEnDist(rel)) {
    verificar(`prerender ${route.path} → ${rel} existe`, [`falta dist/${rel}`])
    continue
  }
  const html = leer(rel)
  const root = extraerRoot(html)
  if (!root) {
    problemas.push('no encuentro <div id="root">…</div> justo antes de </body>')
  } else {
    if (root.inner.trim() === '') problemas.push('#root está vacío: no hubo contenido real')
    const ssrPath = atributo(root.attrs, 'data-ssr-path')
    if (ssrPath !== route.path) {
      problemas.push(`data-ssr-path="${ssrPath}" no coincide con la ruta "${route.path}"`)
    }
    if (/^\s*<(link|meta|title|script)\b/i.test(root.inner)) {
      problemas.push('el contenido de #root empieza con una etiqueta de <head> filtrada al body')
    }
  }
  for (const marca of ['<!--$!-->', '<!--$?-->', '<template']) {
    if (html.includes(marca)) problemas.push(`contiene "${marca}" (Suspense sin resolver)`)
  }
  const h1s = contarOcurrencias(html, /<h1[\s>]/gi)
  if (h1s !== 1) problemas.push(`tiene ${h1s} <h1> (debe ser exactamente 1)`)

  verificar(`prerender ${route.path} → dist/${rel}`, problemas)
}

// ─── 3. Head: título, description, robots, canonical, OG/Twitter, JSON-LD ─────────────

const titulosIndexables = new Map()
const descripcionesIndexables = new Map()

for (const route of PRERENDER_PAGINAS) {
  const rel = outputFileFor(route)
  if (!existeEnDist(rel)) continue // ya reportado arriba
  const html = leer(rel)
  const problemas = []

  const titles = contarOcurrencias(html, /<title\b/gi)
  if (titles !== 1) problemas.push(`${titles} <title> (debe ser exactamente 1)`)
  const descs = contarOcurrencias(html, /<meta[^>]*name="description"/gi)
  if (descs !== 1) problemas.push(`${descs} meta description (debe ser exactamente 1)`)
  const robotsN = contarOcurrencias(html, /<meta[^>]*name="robots"/gi)
  if (robotsN !== 1) problemas.push(`${robotsN} meta robots (debe ser exactamente 1)`)

  const tituloTexto = decodeEntities((html.match(/<title[^>]*>([^<]*)<\/title>/) ?? [, ''])[1])
  const descTexto = contenidoMeta(html, 'name', 'description') ?? ''

  if (route.index) {
    const largoTitulo = codePoints(tituloTexto)
    if (largoTitulo > 60) problemas.push(`título de ${largoTitulo} caracteres (máximo 60)`)
    const largoDesc = codePoints(descTexto)
    if (largoDesc < 70 || largoDesc > 160) {
      problemas.push(`descripción de ${largoDesc} caracteres (debe ser 70–160)`)
    }
    titulosIndexables.set(route.path, tituloTexto)
    descripcionesIndexables.set(route.path, descTexto)

    const canonicalHref = (html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/) ?? [, null])[1]
    const canonicalCount = contarOcurrencias(html, /<link[^>]*rel="canonical"/gi)
    const esperado = mod.canonicalFor(route.path)
    if (canonicalCount !== 1) problemas.push(`${canonicalCount} <link rel="canonical"> (debe ser 1)`)
    else if (canonicalHref !== esperado) {
      problemas.push(`canonical="${canonicalHref}", esperaba "${esperado}"`)
    } else if (!canonicalHref.startsWith('https://www.heladosmados.com')) {
      problemas.push(`canonical no empieza por https://www.heladosmados.com: ${canonicalHref}`)
    }
    const ogUrl = contenidoMeta(html, 'property', 'og:url')
    if (ogUrl !== esperado) problemas.push(`og:url="${ogUrl}" no coincide con el canonical`)
  }

  for (const prop of ['og:title', 'og:description', 'og:type']) {
    if (!contenidoMeta(html, 'property', prop)) problemas.push(`falta ${prop}`)
  }
  if (!contenidoMeta(html, 'name', 'twitter:card')) problemas.push('falta twitter:card')
  const ogImage = contenidoMeta(html, 'property', 'og:image')
  if (!ogImage) {
    problemas.push('falta og:image')
  } else if (!ogImage.startsWith(SITE_URL)) {
    problemas.push(`og:image no es absoluta: ${ogImage}`)
  } else {
    const relImg = ogImage.slice(SITE_URL.length)
    if (!existeEnDist(relImg.replace(/^\//, ''))) {
      problemas.push(`og:image apunta a ${relImg}, que no existe en dist`)
    }
  }

  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const parsed = JSON.parse(m[1])
      if (!('@graph' in parsed) && !('@type' in parsed && '@context' in parsed)) {
        problemas.push('un ld+json no tiene ("@context" y "@type") ni "@graph"')
      }
    } catch (e) {
      problemas.push(`un ld+json no parsea: ${e.message}`)
    }
  }

  for (const rel2 of assetsReferenciados(html)) {
    if (!existeEnDist(rel2.replace(/^\//, ''))) {
      problemas.push(`referencia ${rel2}, que no existe en dist`)
    }
  }

  verificar(`head de ${route.path}`, problemas)
}

{
  const problemas = []
  const porTitulo = new Map()
  for (const [p, t] of titulosIndexables) {
    if (!porTitulo.has(t)) porTitulo.set(t, [])
    porTitulo.get(t).push(p)
  }
  for (const [t, paths] of porTitulo) if (paths.length > 1) problemas.push(`título repetido "${t}" en ${paths.join(', ')}`)

  const porDesc = new Map()
  for (const [p, d] of descripcionesIndexables) {
    if (!porDesc.has(d)) porDesc.set(d, [])
    porDesc.get(d).push(p)
  }
  for (const [d, paths] of porDesc) if (paths.length > 1) problemas.push(`descripción repetida en ${paths.join(', ')}`)

  verificar('títulos y descripciones únicos entre indexables', problemas)
}

// ─── 4. Nada de GTM en el HTML estático ────────────────────────────────────────────────

{
  const problemas = []
  for (const file of listarHtml(DIST)) {
    if (fs.readFileSync(file, 'utf8').includes('googletagmanager')) {
      problemas.push(path.relative(DIST, file))
    }
  }
  verificar('ningún dist/**/*.html contiene "googletagmanager"', problemas)
}

// ─── 5. spa.html y 404.html ─────────────────────────────────────────────────────────────

{
  const problemas = []
  if (!existeEnDist('spa.html')) {
    problemas.push('falta dist/spa.html')
  } else {
    const html = leer('spa.html')
    const root = extraerRoot(html)
    if (!root) problemas.push('spa.html no tiene <div id="root">…</div>')
    else {
      if (root.inner.trim() !== '') problemas.push('#root de spa.html no está vacío')
      if (atributo(root.attrs, 'data-ssr-path') !== null) problemas.push('spa.html tiene data-ssr-path')
    }
    const robots = contenidoMeta(html, 'name', 'robots')
    if (!robots || !robots.includes('noindex')) problemas.push(`robots de spa.html = "${robots}" (debe incluir noindex)`)
  }
  verificar('spa.html: shell vacío, noindex, sin data-ssr-path', problemas)
}

{
  const problemas = []
  const rel = outputFileFor(NOT_FOUND)
  if (!existeEnDist(rel)) {
    problemas.push(`falta dist/${rel}`)
  } else {
    const html = leer(rel)
    const robots = contenidoMeta(html, 'name', 'robots')
    if (!robots || !robots.includes('noindex')) problemas.push(`robots = "${robots}" (debe incluir noindex)`)
    const h1s = contarOcurrencias(html, /<h1[\s>]/gi)
    if (h1s !== 1) problemas.push(`tiene ${h1s} <h1> (debe ser exactamente 1)`)
    const root = extraerRoot(html)
    if (root && atributo(root.attrs, 'data-ssr-path') !== null) problemas.push('404.html tiene data-ssr-path')
  }
  verificar('404.html: noindex, un solo h1, sin data-ssr-path', problemas)
}

{
  const problemas = []
  for (const route of SEO_ROUTES) {
    if (route.kind !== 'spa') continue
    const rel = outputFileFor(route)
    if (existeEnDist(rel)) problemas.push(`dist/${rel} existe y taparía el rewrite a /spa`)
  }
  verificar('ninguna ruta spa tiene su propio archivo estático en dist', problemas)
}

// ─── 6. sitemap.xml y robots.txt ────────────────────────────────────────────────────────

{
  const problemas = []
  if (!existeEnDist('sitemap.xml')) {
    problemas.push('falta dist/sitemap.xml')
  } else {
    const xml = leer('sitemap.xml')
    const locs = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decodeEntities(m[1])))
    const esperados = new Set(SEO_ROUTES.filter(r => r.index).map(r => mod.canonicalFor(r.path)))
    for (const url of esperados) if (!locs.has(url)) problemas.push(`falta en el sitemap: ${url}`)
    for (const url of locs) if (!esperados.has(url)) problemas.push(`sobra en el sitemap: ${url}`)

    // El sitemap servido tiene que ser exactamente el que produce buildSitemapXml.
    const esperadoXml = buildSitemapXml(SEO_ROUTES)
    if (esperadoXml !== xml) problemas.push('dist/sitemap.xml no coincide byte a byte con buildSitemapXml(SEO_ROUTES)')
  }
  verificar('sitemap.xml == rutas indexables', problemas)
}

{
  const problemas = []
  const robotsPath = path.join(DIST, 'robots.txt')
  if (!fs.existsSync(robotsPath)) {
    problemas.push('falta dist/robots.txt')
  } else {
    const txt = fs.readFileSync(robotsPath, 'utf8')
    if (!/^Sitemap:/m.test(txt)) problemas.push('no tiene una línea "Sitemap:"')
    if (/^Disallow:\s*\/\s*$/m.test(txt)) problemas.push('tiene "Disallow: /" a secas: bloquearía todo el sitio')
  }
  verificar('robots.txt', problemas)
}

// ─── 7. vercel.json ─────────────────────────────────────────────────────────────────────

/** Traductor mínimo de `source` de Vercel a RegExp: alcanza para lo que este proyecto usa
 *  (":x*" al final de un segmento, ":x" simple, y grupos de regex que Vercel deja pasar
 *  tal cual, como en el catch-all histórico "/(.*)"). No es un path-to-regexp completo. */
function sourceToRegex(source) {
  const out = source
    .replace(/\/:[A-Za-z0-9_]+\*/g, '(?:/.*)?')
    .replace(/:[A-Za-z0-9_]+/g, '[^/]+')
  return new RegExp(`^${out}$`)
}

if (!fs.existsSync(VERCEL_JSON)) {
  verificar('vercel.json', ['no existe'])
} else {
  const vercel = JSON.parse(fs.readFileSync(VERCEL_JSON, 'utf8'))
  const rewrites = vercel.rewrites ?? []
  const redirects = vercel.redirects ?? []
  const headers = vercel.headers ?? []

  {
    const problemas = []
    if (vercel.cleanUrls !== true) problemas.push('cleanUrls no es true')
    if (vercel.trailingSlash !== false) problemas.push('trailingSlash no es false')
    verificar('vercel.json: cleanUrls / trailingSlash', problemas)
  }

  const rewritesConRegex = rewrites.map(r => ({ ...r, regex: sourceToRegex(r.source) }))
  const headersConRegex = headers.map(h => ({ ...h, regex: sourceToRegex(h.source) }))

  {
    const problemas = []
    for (const route of SEO_ROUTES.filter(r => r.kind === 'spa')) {
      const tieneRewrite = rewritesConRegex.some(
        r => r.regex.test(route.path) && (r.destination === '/spa' || r.destination === '/spa.html')
      )
      if (!tieneRewrite) problemas.push(`${route.path}: ningún rewrite hacia /spa`)

      const tieneNoindex = headersConRegex.some(
        h =>
          h.regex.test(route.path) &&
          (h.headers ?? []).some(
            hh => hh.key.toLowerCase() === 'x-robots-tag' && hh.value.toLowerCase().includes('noindex')
          )
      )
      if (!tieneNoindex) problemas.push(`${route.path}: ninguna regla X-Robots-Tag con noindex`)
    }
    verificar('cada ruta spa tiene rewrite a /spa y header X-Robots-Tag noindex', problemas)
  }

  {
    const problemas = []
    for (const r of rewritesConRegex) {
      const cubierta = SEO_ROUTES.some(route => route.kind === 'spa' && r.regex.test(route.path))
      if (!cubierta) problemas.push(`rewrite "${r.source}" no corresponde a ninguna ruta spa`)
    }
    verificar('cada rewrite de vercel.json corresponde a una ruta spa', problemas)
  }

  {
    const problemas = []
    const pathsPrerender = ['/zz-no-existe', ...PRERENDER_PAGINAS.map(r => r.path)]
    for (const p of pathsPrerender) {
      const atrapada = rewritesConRegex.find(r => r.regex.test(p))
      if (atrapada) problemas.push(`"${p}" coincide con el rewrite "${atrapada.source}" (catch-all)`)
    }
    verificar('ninguna ruta prerenderizada (ni /zz-no-existe) cae en un rewrite', problemas)
  }

  {
    const problemas = []
    for (const route of SEO_ROUTES.filter(r => r.kind === 'redirect')) {
      const match = redirects.find(r => sourceToRegex(r.source).test(route.path))
      if (!match) {
        problemas.push(`${route.path}: no hay redirect en vercel.json`)
      } else {
        if (match.destination !== route.redirectTo) {
          problemas.push(`${route.path}: destino "${match.destination}", esperaba "${route.redirectTo}"`)
        }
        if (match.permanent !== true && match.statusCode !== 308) {
          problemas.push(`${route.path}: el redirect no es permanente (308)`)
        }
      }
    }
    verificar('cada ruta redirect tiene su redirect permanente en vercel.json', problemas)
  }

  {
    const problemas = []
    const tieneInmutable = headersConRegex.some(
      h =>
        /^\/assets\//.test(h.source) &&
        (h.headers ?? []).some(
          hh => hh.key.toLowerCase() === 'cache-control' && hh.value.toLowerCase().includes('immutable')
        )
    )
    if (!tieneInmutable) problemas.push('no encuentro una regla Cache-Control immutable para /assets/(.*)')
    verificar('vercel.json: /assets/(.*) con Cache-Control immutable', problemas)
  }
}

// ─── Resumen ─────────────────────────────────────────────────────────────────────────

console.log()
if (fallos > 0) {
  console.log(`✖ ${fallos} de ${checks} checks fallaron`)
  process.exit(1)
}
console.log(`✓ ${checks} de ${checks} checks pasaron`)
