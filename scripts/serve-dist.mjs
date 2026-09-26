#!/usr/bin/env node
/**
 * Emulador local de vercel.json — es lo que corre `npm run preview`.
 *
 * No es Vercel real: sirve dist/ en un servidor HTTP mínimo que respeta el mismo contrato
 * que describe vercel.json (redirects, cleanUrls, rewrites a /spa, headers), para poder
 * probar el pipeline completo antes de desplegar. Sin dependencias nuevas: solo node:
 * builtins, para no tocar package.json.
 *
 * El puerto 3000 es fijo a propósito, no una preferencia: es el único origen local que
 * Supabase acepta para el redirect_to de OAuth con Google (ver CLAUDE.md y
 * vite.config.ts). Si está ocupado, este script falla con un mensaje claro en vez de
 * arrancar en otro puerto en silencio — eso es exactamente lo que hace que "en mi
 * máquina funciona" y "el login rebota a producción" sean el mismo bug.
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import zlib from 'node:zlib'
import { ROOT, die } from './lib/db.mjs'

const PUERTO = 3000
const DIST = path.join(ROOT, 'dist')

if (!fs.existsSync(DIST)) {
  die(`No encuentro ${path.relative(ROOT, DIST)}.\n\n  Corre antes:  npm run build`)
}

const VERCEL = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))

const TIPOS_DE_CONTENIDO = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json; charset=utf-8',
}

// ─── "source" de vercel.json → RegExp ───────────────────────────────────────────────────
//
// Basta con reconocer lo que el propio vercel.json usa: segmentos literales, ':nombre'
// (un segmento), ':nombre*' (uno o más, incluidas barras) y grupos ya escritos a mano
// como '(perfil|cupones|...)' o '(.*)', que son regex de verdad y se copian tal cual.
// No hace falta sustituir nada en los destinos: todos los de este archivo son literales
// ('/spa', '/perfil', ...), así que solo se necesita el `test()` booleano.
function fuenteARegExp(fuente) {
  let patron = ''
  let i = 0
  while (i < fuente.length) {
    const c = fuente[i]
    if (c === ':') {
      let j = i + 1
      while (j < fuente.length && /[A-Za-z0-9_]/.test(fuente[j])) j++
      const esComodin = fuente[j] === '*'
      patron += esComodin ? '(.+)' : '([^/]+)'
      i = esComodin ? j + 1 : j
    } else if (c === '(') {
      const cierre = fuente.indexOf(')', i)
      patron += fuente.slice(i, cierre + 1)
      i = cierre + 1
    } else if ('.*+?^${}|[]\\'.includes(c)) {
      patron += `\\${c}`
      i++
    } else {
      patron += c
      i++
    }
  }
  return new RegExp(`^${patron}$`)
}

function primeraCoincidencia(reglas, pathname) {
  return (reglas ?? []).find((regla) => fuenteARegExp(regla.source).test(pathname))
}

function encabezadosParaRuta(pathname) {
  const resultado = {}
  for (const regla of VERCEL.headers ?? []) {
    if (!fuenteARegExp(regla.source).test(pathname)) continue
    for (const { key, value } of regla.headers) resultado[key] = value
  }
  return resultado
}

// ─── Resolver un pathname a un archivo real dentro de dist/ ─────────────────────────────
//
// cleanUrls: '/x' sirve 'x.html' si existe; '/' sirve 'index.html'; y si el pathname ya
// trae extensión (.js, .xml, .ico...) se busca tal cual, sin probar el sufijo '.html'.
function resolverArchivo(pathname) {
  const relativo = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const candidatos = path.extname(relativo) ? [relativo] : [relativo, `${relativo}.html`]

  for (const candidato of candidatos) {
    const resuelto = path.normalize(path.join(DIST, candidato))
    // Nunca servir fuera de dist/, así el pathname traiga un "../" a mano.
    if (resuelto !== DIST && !resuelto.startsWith(DIST + path.sep)) continue
    if (fs.existsSync(resuelto) && fs.statSync(resuelto).isFile()) return resuelto
  }
  return null
}

function comprimible(tipoDeContenido) {
  return /^(text\/|application\/(xml|json|manifest\+json))/.test(tipoDeContenido)
}

// Comprimir con brotli al máximo en cada petición tarda ~0.5 s por bundle y, por ser
// síncrono, deja en cola todo lo demás (CSS, fuentes): Lighthouse lo medía como una regresión
// de FCP/LCP que en Vercel no existe, porque su CDN sirve lo ya comprimido. Así que se
// comprime una sola vez por archivo, codificación y versión (mtime), y se sirve de memoria.
const cacheComprimida = new Map()

function comprimir(archivo, codificacion, buffer) {
  const clave = `${archivo}|${codificacion}|${fs.statSync(archivo).mtimeMs}`
  let cuerpo = cacheComprimida.get(clave)
  if (!cuerpo) {
    cuerpo = codificacion === 'br' ? zlib.brotliCompressSync(buffer) : zlib.gzipSync(buffer)
    cacheComprimida.set(clave, cuerpo)
  }
  return cuerpo
}

function negociarCompresion(aceptaEncoding, archivo, buffer, tipoDeContenido) {
  if (!comprimible(tipoDeContenido)) return { cuerpo: buffer, codificacion: null }
  const acepta = aceptaEncoding ?? ''
  if (/\bbr\b/.test(acepta)) return { cuerpo: comprimir(archivo, 'br', buffer), codificacion: 'br' }
  if (/\bgzip\b/.test(acepta)) return { cuerpo: comprimir(archivo, 'gzip', buffer), codificacion: 'gzip' }
  return { cuerpo: buffer, codificacion: null }
}

// Precalienta la caché al arrancar para que ni la primera petición pague la compresión.
function precalentarCompresion(dir = DIST) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name)
    if (entrada.isDirectory()) { precalentarCompresion(ruta); continue }
    const tipo = TIPOS_DE_CONTENIDO[path.extname(ruta)] ?? 'application/octet-stream'
    if (!comprimible(tipo)) continue
    const buffer = fs.readFileSync(ruta)
    comprimir(ruta, 'br', buffer)
    comprimir(ruta, 'gzip', buffer)
  }
}

function enviarArchivo(req, res, status, archivo, encabezadosExtra) {
  const buffer = fs.readFileSync(archivo)
  const tipoDeContenido = TIPOS_DE_CONTENIDO[path.extname(archivo)] ?? 'application/octet-stream'
  const { cuerpo, codificacion } = negociarCompresion(req.headers['accept-encoding'], archivo, buffer, tipoDeContenido)

  res.statusCode = status
  res.setHeader('Content-Type', tipoDeContenido)
  if (codificacion) {
    res.setHeader('Content-Encoding', codificacion)
    res.setHeader('Vary', 'Accept-Encoding')
  }
  for (const [clave, valor] of Object.entries(encabezadosExtra)) res.setHeader(clave, valor)
  res.setHeader('Content-Length', cuerpo.length)
  res.end(req.method === 'HEAD' ? undefined : cuerpo)
}

function redirigir(res, status, ubicacion) {
  res.statusCode = status
  res.setHeader('Location', ubicacion)
  res.setHeader('Content-Length', 0)
  res.end()
}

// ─── El orden importa: es el mismo que describe CLAUDE.md/el plan para este script ─────
function manejar(req, res) {
  const url = new URL(req.url, `http://localhost:${PUERTO}`)
  const pathname = decodeURIComponent(url.pathname)
  const query = url.search

  // 1. trailingSlash: false → 308 sin la barra final (menos la raíz, que no tiene de dónde quitarla).
  if (pathname.length > 1 && pathname.endsWith('/')) {
    redirigir(res, 308, pathname.slice(0, -1) + query)
    return
  }

  // 2. Los redirects explícitos de vercel.json.
  const redirect = primeraCoincidencia(VERCEL.redirects, pathname)
  if (redirect) {
    redirigir(res, redirect.permanent === false ? 307 : 308, redirect.destination + query)
    return
  }

  // 3. cleanUrls: pedir el ".html" a mano redirige a la ruta limpia (nunca al revés).
  if (pathname.endsWith('.html')) {
    let limpio = pathname.slice(0, -'.html'.length)
    if (limpio.endsWith('/index')) limpio = limpio.slice(0, -'/index'.length) || '/'
    redirigir(res, 308, (limpio || '/') + query)
    return
  }

  const encabezadosExtra = encabezadosParaRuta(pathname)

  // 4. El filesystem gana sobre los rewrites: si existe el archivo (o su versión ".html"), se sirve.
  const archivo = resolverArchivo(pathname)
  if (archivo) {
    enviarArchivo(req, res, 200, archivo, encabezadosExtra)
    return
  }

  // 5. Rewrites: las rutas privadas sirven spa.html. Esto NUNCA manda un Location, así que
  //    la barra de direcciones (y su query, ?code=... incluido) se queda tal cual.
  const rewrite = primeraCoincidencia(VERCEL.rewrites, pathname)
  if (rewrite) {
    const destino = resolverArchivo(rewrite.destination)
    if (destino) {
      enviarArchivo(req, res, 200, destino, encabezadosExtra)
      return
    }
  }

  // 6. Nada coincidió: 404 real (con status 404), no el soft-404 que servía la SPA antes.
  const noEncontrado = path.join(DIST, '404.html')
  if (fs.existsSync(noEncontrado)) {
    enviarArchivo(req, res, 404, noEncontrado, encabezadosExtra)
    return
  }
  res.statusCode = 404
  res.end('404')
}

const server = http.createServer((req, res) => {
  try {
    manejar(req, res)
  } catch (error) {
    console.error(error)
    if (!res.headersSent) res.statusCode = 500
    res.end('Error interno del emulador.')
  }
})

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    die(
      `El puerto ${PUERTO} ya está en uso.\n\n` +
        '  Es el único origen local en la lista blanca de Redirect URLs de Supabase (ver\n' +
        '  CLAUDE.md): nunca lo cambies en automático, o el login con Google va a rebotar\n' +
        '  a producción sin ningún aviso.\n\n' +
        '  Cierra lo que lo esté usando (¿otro "npm run dev" o "npm run preview" a la vez?)\n' +
        '  e inténtalo de nuevo.'
    )
  }
  throw error
})

precalentarCompresion()

server.listen(PUERTO, () => {
  console.log(`✓ Sirviendo dist/ en http://localhost:${PUERTO} (Ctrl+C para salir)`)
})
