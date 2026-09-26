#!/usr/bin/env node
/**
 * Prerenderiza en build las rutas públicas: escribe el HTML real de cada una (contenido
 * de verdad, no el shell vacío) en dist/, más spa.html (el shell para las rutas privadas,
 * servido por los rewrites de vercel.json) y sitemap.xml.
 *
 * Corre después de build:client (vite build, que deja dist/index.html con sus assets con
 * hash) y build:ssr (vite build --ssr src/entry-server.tsx --outDir dist-ssr). Ver
 * package.json.
 *
 * PRERENDER_MODE=shell es el interruptor de emergencia: escribe los mismos archivos, con
 * el head correcto por ruta, pero con el root vacío y sin `data-ssr-path` en ninguno — es
 * decir, exactamente el comportamiento de hoy en producción (toda la app se monta con
 * createRoot). Sirve para revertir el prerender sin tocar el resto del pipeline si algo
 * sale mal después de un deploy.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT, die } from './lib/db.mjs'

// react-dom/server elige su build de desarrollo o de producción mirando esto en el
// momento en que se importa (no después) — así que hay que fijarlo ANTES de cargar el
// bundle del SSR. En producción real (Vercel) ya viene en 'production'; esto es para que
// correr el script a mano no imprima advertencias de desarrollo ni sea más lento.
process.env.NODE_ENV ??= 'production'

const MODO_SHELL = process.env.PRERENDER_MODE === 'shell'

const DIST = path.join(ROOT, 'dist')
const DIST_SSR = path.join(ROOT, 'dist-ssr')

const rutaEntrada = path.join(DIST_SSR, 'entry-server.js')
if (!fs.existsSync(rutaEntrada)) {
  die(
    `No encuentro ${path.relative(ROOT, rutaEntrada)}.\n\n` +
      '  Corre antes:  npm run build:ssr'
  )
}

// pathToFileURL es obligatorio en Windows: un import() con una ruta absoluta tipo
// "C:\..." no es una URL de módulo válida.
const {
  render,
  SEO_ROUTES,
  NOT_FOUND,
  SPA_SHELL,
  outputFileFor,
  buildHeadTags,
  headTagsToHtml,
  buildSitemapXml,
  SUPABASE_ORIGIN,
} = await import(pathToFileURL(rutaEntrada).href)

// ─── La plantilla: dist/index.html, ya construido por Vite ─────────────────────────────

const rutaIndex = path.join(DIST, 'index.html')
if (!fs.existsSync(rutaIndex)) {
  die(
    `No encuentro ${path.relative(ROOT, rutaIndex)}.\n\n` +
      '  Corre antes:  npm run build:client'
  )
}

let plantilla = fs.readFileSync(rutaIndex, 'utf8')

const BLOQUE_SEO_RE = /<!--seo:start-->[\s\S]*?<!--seo:end-->/
const ROOT_DIV_RE = /<div id="root"[^>]*>[\s\S]*?<\/div>/

if (!BLOQUE_SEO_RE.test(plantilla)) {
  die(
    'dist/index.html no tiene los marcadores <!--seo:start-->/<!--seo:end-->. ' +
      '¿Cambió index.html sin avisar a este script?'
  )
}
const coincidenciasRoot = plantilla.match(/<div id="root"/g) ?? []
if (coincidenciasRoot.length !== 1) {
  die(
    `dist/index.html tiene ${coincidenciasRoot.length} <div id="root">; se esperaba exactamente 1.`
  )
}
if (plantilla.includes('data-ssr-path')) {
  die(
    'dist/index.html ya trae data-ssr-path. Ese atributo lo agrega este script por ruta; ' +
      'no debería estar en la plantilla de partida.'
  )
}

// ─── Preload de la fuente del H1 + preconnect a Supabase, una sola vez para todo ────────
//
// Van en TODAS las páginas (incluidas spa.html y 404.html): son pistas al navegador, no
// contenido, así que no hay razón para que dependan de la ruta.

function buscarWoff2DeBungee() {
  const carpetaAssets = path.join(DIST, 'assets')
  if (!fs.existsSync(carpetaAssets)) return null
  const encontrado = fs
    .readdirSync(carpetaAssets)
    .find((archivo) => archivo.startsWith('bungee-latin-400-normal-') && archivo.endsWith('.woff2'))
  return encontrado ? `/assets/${encontrado}` : null
}

const woff2Bungee = buscarWoff2DeBungee()
if (!woff2Bungee) {
  console.warn(
    '⚠ No encontré el woff2 de Bungee en dist/assets (¿@fontsource/bungee ya está integrado?). ' +
      'Sigo sin el <link rel="preload"> de la fuente del H1.'
  )
}

// ─── modulepreload del chunk propio de las rutas con lazyWithPreload ───────────────────
//
// Terminos/Privacidad ya no son un import directo en AppRoutes.tsx (ver esa nota ahí):
// arrastraban LegalDocument + legalContent.ts —el AST completo de los dos documentos,
// ~52 KB minificados— al bundle de entrada de la home. `lazyWithPreload` los separó en su
// propio chunk, pero eso por sí solo cambia CUÁNDO se piden (recién cuando el JS principal
// ya corrió y llamó a `.preload()`/al import()), no que se pidan en paralelo con él. Este
// bloque lee el manifiesto de Vite (build.manifest en vite.config.ts) para mandarles un
// <link rel="modulepreload"> desde su propio HTML — así ese chunk (y el suyo propio, y sus
// dependencias transitivas: los iconos que pinta LegalDocument, etc.) empieza a bajar al
// mismo tiempo que el bundle principal, en vez de esperar a que este ya esté corriendo.
//
// El mapa debe reflejar los mismos paths que `preloadByPath` en src/AppRoutes.tsx.
const RUTAS_CON_CHUNK_PROPIO = {
  '/terminos': 'src/pages/Terminos.tsx',
  '/privacidad': 'src/pages/Privacidad.tsx',
}

const rutaManifest = path.join(DIST, '.vite', 'manifest.json')
let manifest = null
if (fs.existsSync(rutaManifest)) {
  manifest = JSON.parse(fs.readFileSync(rutaManifest, 'utf8'))
} else {
  console.warn(
    '⚠ No encontré dist/.vite/manifest.json (revisa build.manifest en vite.config.ts). ' +
      'Sigo sin los <link rel="modulepreload"> de /terminos y /privacidad: solo bajarían ' +
      'su chunk cuando el bundle principal ya esté corriendo, no en paralelo con él.'
  )
}

/**
 * Todos los chunks (archivos .js reales, no las claves internas del manifiesto) que hacen
 * falta para pintar la entrada `claveEntrada`, siguiendo `imports` de forma transitiva.
 * Se excluyen los que la propia plantilla YA precarga para el bundle principal (react,
 * jsx-runtime: repetirlos no ayuda) y la clave pseudo-import `"index.html"` que usa Vite
 * para marcar CSS compartido, que no es un chunk que se pueda precargar.
 */
function resolverChunksDeEntrada(claveEntrada) {
  const yaPrecargados = new Set(manifest['index.html']?.imports ?? [])
  const archivos = []
  const vistos = new Set()

  function visitar(clave) {
    if (vistos.has(clave) || clave === 'index.html') return
    vistos.add(clave)
    if (clave !== claveEntrada && yaPrecargados.has(clave)) return
    const entrada = manifest[clave]
    if (!entrada) return
    if (entrada.file) archivos.push(entrada.file)
    for (const dep of entrada.imports ?? []) visitar(dep)
  }

  visitar(claveEntrada)
  return archivos
}

function preloadsDeChunkPropio(routePath) {
  const claveEntrada = RUTAS_CON_CHUNK_PROPIO[routePath]
  if (!claveEntrada || !manifest) return []
  return resolverChunksDeEntrada(claveEntrada).map(
    (archivo) => `<link rel="modulepreload" href="/${archivo}">`
  )
}

const pistasGlobales = [
  woff2Bungee && `<link rel="preload" href="${woff2Bungee}" as="font" type="font/woff2" crossorigin>`,
  `<link rel="preconnect" href="${SUPABASE_ORIGIN}" crossorigin>`,
]
  .filter(Boolean)
  .join('\n    ')

plantilla = plantilla.replace('</head>', `    ${pistasGlobales}\n  </head>`)

// ─── Hoistables: prerender/renderToString los ponen antes del contenido cuando el árbol
// no tiene un <head> real (nuestro AppShell no lo tiene: es un Fragment) ───────────────

const HOISTABLE_RE =
  /^\s*(<link\b[^>]*>|<meta\b[^>]*>|<title\b[^>]*>[\s\S]*?<\/title>|<script\b[^>]*>[\s\S]*?<\/script>)/i

function separarHoistables(html) {
  const hoistables = []
  let resto = html
  for (;;) {
    const coincidencia = resto.match(HOISTABLE_RE)
    if (!coincidencia) break
    hoistables.push(coincidencia[1])
    resto = resto.slice(coincidencia[0].length)
  }
  return { hoistables, resto }
}

function construirPagina(route, cuerpoRenderizado, hoistables) {
  let pagina = plantilla

  if (hoistables.length > 0) {
    pagina = pagina.replace('</head>', `    ${hoistables.join('\n    ')}\n  </head>`)
  }

  pagina = pagina.replace(BLOQUE_SEO_RE, headTagsToHtml(buildHeadTags(route)))

  // Sin data-ssr-path para el 404 (no hay una URL real con la que pueda coincidir) ni en
  // modo shell (ahí NINGUNA página se marca como prerenderizada: todas montan con createRoot).
  const dataSsrPath = !MODO_SHELL && route.path !== '*' ? ` data-ssr-path="${route.path}"` : ''
  const contenidoRoot = MODO_SHELL ? '' : cuerpoRenderizado
  pagina = pagina.replace(ROOT_DIV_RE, `<div id="root"${dataSsrPath}>${contenidoRoot}</div>`)

  return pagina
}

// ─── Una página por ruta prerenderizable, más el 404 ────────────────────────────────────

// NOT_FOUND puede o no venir también dentro de SEO_ROUTES (es cosa de src/seo/routes.ts);
// se filtra por si acaso, para no renderizarlo dos veces.
const rutasAPrerenderizar = [
  ...SEO_ROUTES.filter((route) => route.kind === 'prerender' && route.path !== '*'),
  NOT_FOUND,
]

const resumen = []

for (const route of rutasAPrerenderizar) {
  const url = route.path === '*' ? '/__404__' : route.path
  const html = MODO_SHELL ? '' : await render(url)
  const { hoistables, resto } = separarHoistables(html)
  const preloadsPropios = MODO_SHELL ? [] : preloadsDeChunkPropio(route.path)
  const pagina = construirPagina(route, resto, [...hoistables, ...preloadsPropios])
  const nombreArchivo = outputFileFor(route)
  fs.writeFileSync(path.join(DIST, nombreArchivo), pagina, 'utf8')
  resumen.push([route.path, nombreArchivo, Buffer.byteLength(pagina, 'utf8')])
}

// ─── spa.html: el head de SPA_SHELL, root siempre vacío ────────────────────────────────

let paginaSpa = plantilla.replace(BLOQUE_SEO_RE, headTagsToHtml(buildHeadTags(SPA_SHELL)))
paginaSpa = paginaSpa.replace(ROOT_DIV_RE, '<div id="root"></div>')
fs.writeFileSync(path.join(DIST, 'spa.html'), paginaSpa, 'utf8')
resumen.push(['(spa)', 'spa.html', Buffer.byteLength(paginaSpa, 'utf8')])

// ─── sitemap.xml ────────────────────────────────────────────────────────────────────────

const sitemap = buildSitemapXml(SEO_ROUTES)
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8')
resumen.push(['(sitemap)', 'sitemap.xml', Buffer.byteLength(sitemap, 'utf8')])

// ─── Limpieza: el manifiesto ya cumplió su propósito (arriba) ──────────────────────────
//
// dist/ es justo lo que se publica: nada obliga a Vercel a NO servir dist/.vite/manifest.json
// como un archivo estático más, y no tiene nada que hacer publicado (son nombres internos
// de chunks, no un secreto, pero tampoco información que alguien de fuera necesite).
fs.rmSync(path.join(DIST, '.vite'), { recursive: true, force: true })

// ─── Resumen ────────────────────────────────────────────────────────────────────────────

console.log(
  MODO_SHELL
    ? '\nPrerender (PRERENDER_MODE=shell — heads reales, root vacío en todo):\n'
    : '\nPrerender:\n'
)
for (const [ruta, archivo, bytes] of resumen) {
  console.log(`  ${ruta.padEnd(22)} → dist/${archivo.padEnd(18)} ${bytes} bytes`)
}
console.log('')
