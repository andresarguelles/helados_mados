/**
 * El manifiesto SEO: una entrada por cada `<Route>` real de la app (hoy en `src/App.tsx`,
 * mañana en `src/AppRoutes.tsx` — A1 las mueve sin cambiar los `path`).
 *
 * De aquí salen las cuatro cosas que no pueden divergir entre sí: el `<head>` del HTML
 * prerenderizado (`head.ts` + `scripts/prerender.mjs`), el `<head>` que se reescribe al
 * navegar en el cliente (`applyHead`), el `sitemap.xml` (`sitemap.ts`) y las reglas de
 * `vercel.json` que verifica `scripts/seo-check.mjs`.
 *
 * Indexables: `/`, `/canjear`, `/terminos`, `/privacidad`, `/eliminar-cuenta`. `/login`
 * lleva `noindex,follow` (hay que poder llegar a él siguiendo enlaces, pero no tiene
 * contenido propio que indexar). Las rutas privadas y de admin llevan `noindex`; admin
 * además `nofollow`, porque no hay nada ahí que valga la pena que un rastreador siga.
 */
import { matchPath } from 'react-router-dom'
import { SITE_URL as SITE_URL_NEGOCIO } from '../content/negocio'
import { LEGAL_META } from '../content/legal/generated/legalMeta'
import { schemaBreadcrumbList, schemaHome, schemaWebPage } from './schema'
import type { Migas, SeoRoute } from './types'

/** Reexportado desde la fuente única del negocio: nadie más vuelve a teclear el dominio. */
export const SITE_URL = SITE_URL_NEGOCIO

/** `'/'` → `SITE_URL + '/'`; cualquier otra ruta → `SITE_URL + path`, sin barra final. */
export function canonicalFor(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
}

/** Resuelve las migas de una ruta (`{ nombre, path }`) a `{ name, url }` para el JSON-LD. */
function migasAbsolutas(migas: readonly Migas[]) {
  return migas.map(m => ({ name: m.nombre, url: canonicalFor(m.path) }))
}

/** Atajo: el `WebPage` + `BreadcrumbList` de una ruta secundaria con migas. */
function schemaSecundaria(route: {
  path: string
  title: string
  description?: string
  migas: readonly Migas[]
  dateModified?: string
}): object[] {
  return [
    schemaWebPage({
      url: canonicalFor(route.path),
      name: route.title,
      description: route.description,
      dateModified: route.dateModified,
    }),
    schemaBreadcrumbList(migasAbsolutas(route.migas)),
  ]
}

// ─── Migas compartidas ────────────────────────────────────────────────────────
const INICIO: Migas = { nombre: 'Inicio', path: '/' }

// ─── Home ─────────────────────────────────────────────────────────────────────

const HOME_TITLE = 'Helados Mados — Heladería espacial en Álvaro Obregón, CDMX'
const HOME_DESCRIPTION =
  'Helados tradicionales en la Estación de Av. Centenario, Álvaro Obregón. Síguenos en ' +
  'TikTok Live, atrapa la palabra secreta y gana tu Medalla.'

const HOME: SeoRoute = {
  path: '/',
  kind: 'prerender',
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  index: true,
  jsonLd: [schemaHome({ url: canonicalFor('/'), title: HOME_TITLE, description: HOME_DESCRIPTION })],
}

// ─── Rutas indexables ───────────────────────────────────────────────────────

const CANJEAR_TITLE = 'Canjear palabra secreta del Live — Helados Mados'
const CANJEAR_DESCRIPTION =
  'Escribe la palabra secreta de nuestro TikTok Live y canjéala aquí: suma un punto y ' +
  'recibe tu cupón QR para pasar por tu helado a la Estación.'
const CANJEAR_MIGAS: Migas[] = [INICIO, { nombre: 'Canjear', path: '/canjear' }]

const CANJEAR: SeoRoute = {
  path: '/canjear',
  kind: 'prerender',
  title: CANJEAR_TITLE,
  description: CANJEAR_DESCRIPTION,
  index: true,
  migas: CANJEAR_MIGAS,
  jsonLd: schemaSecundaria({
    path: '/canjear',
    title: CANJEAR_TITLE,
    description: CANJEAR_DESCRIPTION,
    migas: CANJEAR_MIGAS,
  }),
}

const TERMINOS_TITLE = 'Términos y Condiciones — Helados Mados'
const TERMINOS_DESCRIPTION =
  'Reglas de la promoción de Helados Mados: la palabra secreta, tus puntos, las ' +
  'existencias limitadas y cómo cancelar tu cuenta cuando quieras.'
const TERMINOS_MIGAS: Migas[] = [INICIO, { nombre: 'Términos y Condiciones', path: '/terminos' }]

const TERMINOS: SeoRoute = {
  path: '/terminos',
  kind: 'prerender',
  title: TERMINOS_TITLE,
  description: TERMINOS_DESCRIPTION,
  index: true,
  migas: TERMINOS_MIGAS,
  // Nunca la fecha del build: la única fecha real de un documento legal es la que declara
  // su propio front-matter, y `LEGAL_META` es su único traductor a TypeScript.
  lastmod: LEGAL_META.terminos?.actualizado,
  jsonLd: schemaSecundaria({
    path: '/terminos',
    title: TERMINOS_TITLE,
    description: TERMINOS_DESCRIPTION,
    migas: TERMINOS_MIGAS,
    dateModified: LEGAL_META.terminos?.actualizado,
  }),
}

const PRIVACIDAD_TITLE = 'Aviso de Privacidad — Helados Mados'
const PRIVACIDAD_DESCRIPTION =
  'Qué datos personales trata Helados Mados, para qué los usamos y cómo ejercer tus ' +
  'derechos ARCO o darte de baja del marcador y la plataforma.'
const PRIVACIDAD_MIGAS: Migas[] = [INICIO, { nombre: 'Aviso de Privacidad', path: '/privacidad' }]

const PRIVACIDAD: SeoRoute = {
  path: '/privacidad',
  kind: 'prerender',
  title: PRIVACIDAD_TITLE,
  description: PRIVACIDAD_DESCRIPTION,
  index: true,
  migas: PRIVACIDAD_MIGAS,
  lastmod: LEGAL_META.privacidad?.actualizado,
  jsonLd: schemaSecundaria({
    path: '/privacidad',
    title: PRIVACIDAD_TITLE,
    description: PRIVACIDAD_DESCRIPTION,
    migas: PRIVACIDAD_MIGAS,
    dateModified: LEGAL_META.privacidad?.actualizado,
  }),
}

const ELIMINAR_TITLE = 'Eliminar mi cuenta — Helados Mados'
const ELIMINAR_DESCRIPTION =
  'Solicita aquí la eliminación de tu cuenta de Helados Mados sin instalar la app: tu ' +
  'perfil, tus cupones y tus puntos se borran para siempre.'
const ELIMINAR_MIGAS: Migas[] = [INICIO, { nombre: 'Eliminar cuenta', path: '/eliminar-cuenta' }]

const ELIMINAR_CUENTA: SeoRoute = {
  path: '/eliminar-cuenta',
  kind: 'prerender',
  title: ELIMINAR_TITLE,
  description: ELIMINAR_DESCRIPTION,
  index: true,
  migas: ELIMINAR_MIGAS,
  jsonLd: schemaSecundaria({
    path: '/eliminar-cuenta',
    title: ELIMINAR_TITLE,
    description: ELIMINAR_DESCRIPTION,
    migas: ELIMINAR_MIGAS,
  }),
}

// ─── Login: prerenderizado, pero fuera del índice ──────────────────────────

const LOGIN: SeoRoute = {
  path: '/login',
  kind: 'prerender',
  title: 'Iniciar sesión — Helados Mados',
  description:
    'Entra a tu cuenta de Helados Mados con Google para ver tus puntos, tus cupones y ' +
    'el ranking de Cadetes.',
  index: false,
  robots: 'noindex,follow',
}

// ─── Rutas privadas: se sirven todas por spa.html, cada una con su propio título ──

const AUTH_CALLBACK: SeoRoute = {
  path: '/auth/callback',
  kind: 'spa',
  title: 'Conectando tu cuenta — Helados Mados',
  description: 'Estamos conectando tu cuenta de Google con Helados Mados. Esto toma un segundo.',
  index: false,
  robots: 'noindex,follow',
}

const BIENVENIDA: SeoRoute = {
  path: '/bienvenida',
  kind: 'spa',
  title: 'Completa tu registro — Helados Mados',
  description: 'Elige tu apodo de Cadete, confirma tu WhatsApp y termina tu registro en Helados Mados.',
  index: false,
  robots: 'noindex,follow',
}

const PERFIL: SeoRoute = {
  path: '/perfil',
  kind: 'spa',
  title: 'Mi perfil — Helados Mados',
  description: 'Consulta y actualiza los datos de tu cuenta de Cadete en Helados Mados.',
  index: false,
  robots: 'noindex,follow',
}

const CUPONES: SeoRoute = {
  path: '/cupones',
  kind: 'spa',
  title: 'Mis cupones — Helados Mados',
  description: 'Revisa tus cupones QR pendientes y ya canjeados en Helados Mados.',
  index: false,
  robots: 'noindex,follow',
}

const RANKING: SeoRoute = {
  path: '/ranking',
  kind: 'spa',
  title: 'Ranking de Cadetes — Helados Mados',
  description: 'El marcador público de puntos de todos los Cadetes de Helados Mados.',
  index: false,
  robots: 'noindex,follow',
}

const MISIONES: SeoRoute = {
  path: '/misiones',
  kind: 'spa',
  title: 'Misiones — Helados Mados',
  description: 'Las misiones y recompensas que vienen para los Cadetes de Helados Mados.',
  index: false,
  robots: 'noindex,follow',
}

// ─── Rutas históricas: redirigen, no pintan ────────────────────────────────

const CUENTA_REDIRECT: SeoRoute = {
  path: '/cuenta',
  kind: 'redirect',
  redirectTo: '/perfil',
  title: 'Mi perfil — Helados Mados',
  description: 'Consulta y actualiza los datos de tu cuenta de Cadete en Helados Mados.',
  index: false,
  robots: 'noindex,follow',
}

const AVISO_PRIVACIDAD_REDIRECT: SeoRoute = {
  path: '/aviso-de-privacidad',
  kind: 'redirect',
  redirectTo: '/privacidad',
  title: PRIVACIDAD_TITLE,
  description: PRIVACIDAD_DESCRIPTION,
  index: false,
  robots: 'noindex,follow',
}

// ─── Admin: privadas y además fuera de lo que vale la pena seguir ──────────

const ADMIN: SeoRoute = {
  path: '/admin',
  kind: 'spa',
  title: 'Acceso de Comandantes — Helados Mados',
  description: 'Acceso para el equipo de Helados Mados.',
  index: false,
  robots: 'noindex,nofollow',
}

const ADMIN_DASHBOARD: SeoRoute = {
  path: '/admin/dashboard',
  kind: 'spa',
  title: 'Panel de Comandante — Helados Mados',
  description: 'Gestión de entrenamientos y dinámicas de Helados Mados.',
  index: false,
  robots: 'noindex,nofollow',
}

const ADMIN_SCANNER: SeoRoute = {
  path: '/admin/scanner',
  kind: 'spa',
  title: 'Escáner de cupones — Helados Mados',
  description: 'Escanea cupones QR en la Estación de Helados Mados.',
  index: false,
  robots: 'noindex,nofollow',
}

const ADMIN_USERS: SeoRoute = {
  path: '/admin/users',
  kind: 'spa',
  title: 'Cadetes registrados — Helados Mados',
  description: 'Lista de Cadetes registrados en Helados Mados.',
  index: false,
  robots: 'noindex,nofollow',
}

// El panel de control de las pantallas de mostrador.
const ADMIN_ESTACION: SeoRoute = {
  path: '/admin/estacion',
  kind: 'spa',
  title: 'Estación — Helados Mados',
  description: 'Control de las pantallas de mostrador de la Estación de Helados Mados.',
  index: false,
  robots: 'noindex,nofollow',
}

// Pantallas de mostrador: monitores verticales en modo quiosco dentro de la Estación.
const ADMIN_LEADERBOARD: SeoRoute = {
  path: '/admin/leaderboard',
  kind: 'spa',
  title: 'Ranking en pantalla — Helados Mados',
  description: 'El marcador de Cadetes para el monitor de la Estación de Helados Mados.',
  index: false,
  robots: 'noindex,nofollow',
}

const ADMIN_FLAVORS: SeoRoute = {
  path: '/admin/flavors',
  kind: 'spa',
  title: 'Sabores en pantalla — Helados Mados',
  description: 'Los sabores disponibles para el monitor de la Estación de Helados Mados.',
  index: false,
  robots: 'noindex,nofollow',
}

// Las mismas dos pantallas dibujadas de lado, para una TV que no deja girar la imagen.
const ADMIN_LEADERBOARD_90: SeoRoute = {
  ...ADMIN_LEADERBOARD,
  path: '/admin/leaderboard_90',
  title: 'Ranking en pantalla (girada 90°) — Helados Mados',
}

const ADMIN_LEADERBOARD_270: SeoRoute = {
  ...ADMIN_LEADERBOARD,
  path: '/admin/leaderboard_270',
  title: 'Ranking en pantalla (girada 270°) — Helados Mados',
}

const ADMIN_FLAVORS_90: SeoRoute = {
  ...ADMIN_FLAVORS,
  path: '/admin/flavors_90',
  title: 'Sabores en pantalla (girada 90°) — Helados Mados',
}

const ADMIN_FLAVORS_270: SeoRoute = {
  ...ADMIN_FLAVORS,
  path: '/admin/flavors_270',
  title: 'Sabores en pantalla (girada 270°) — Helados Mados',
}

// ─── 404 y el shell vacío de las rutas `spa` ────────────────────────────────

export const NOT_FOUND: SeoRoute = {
  path: '*',
  kind: 'prerender',
  title: 'Página no encontrada — Helados Mados',
  description:
    'No encontramos esta página. Vuelve al inicio o canjea la palabra secreta del ' +
    'TikTok Live de Helados Mados.',
  index: false,
  robots: 'noindex',
}

/**
 * El `<head>` horneado dentro de `spa.html`, el shell vacío que Vercel sirve (vía rewrite)
 * para todas las rutas `spa`. No es la cabecera final de ninguna ruta real, así que **no**
 * entra a `SEO_ROUTES` — `/spa` no es un `<Route>` de la app y rompería la paridad que
 * `seo-check` exige contra `appRoutePaths`. En cuanto hidrata, `applyHead` la reemplaza por
 * la de `seoForPath(location.pathname)`.
 */
export const SPA_SHELL: SeoRoute = {
  path: '/spa',
  kind: 'spa',
  title: 'Helados Mados',
  description: 'Sección privada de Helados Mados.',
  index: false,
  robots: 'noindex,nofollow',
}

export const SEO_ROUTES: readonly SeoRoute[] = [
  HOME,
  LOGIN,
  CANJEAR,
  AUTH_CALLBACK,
  BIENVENIDA,
  PERFIL,
  CUPONES,
  RANKING,
  MISIONES,
  CUENTA_REDIRECT,
  TERMINOS,
  PRIVACIDAD,
  AVISO_PRIVACIDAD_REDIRECT,
  ELIMINAR_CUENTA,
  ADMIN,
  ADMIN_DASHBOARD,
  ADMIN_SCANNER,
  ADMIN_USERS,
  ADMIN_ESTACION,
  ADMIN_LEADERBOARD,
  ADMIN_FLAVORS,
  ADMIN_LEADERBOARD_90,
  ADMIN_LEADERBOARD_270,
  ADMIN_FLAVORS_90,
  ADMIN_FLAVORS_270,
]

/** `matchPath` insensible a mayúsculas, sobre las rutas del manifiesto; si nada, `NOT_FOUND`. */
export function seoForPath(pathname: string): SeoRoute {
  // Normaliza la barra final: '/canjear/' y '/canjear' son la misma ruta para el manifiesto,
  // aunque `BrowserRouter` las trate como pathnames distintos.
  const normalized =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  const found = SEO_ROUTES.find(route =>
    matchPath({ path: route.path, caseSensitive: false, end: true }, normalized)
  )
  return found ?? NOT_FOUND
}

/** `'/'` → `'index.html'`, `'*'` → `'404.html'`, `'/x'` → `'x.html'`, `'/a/b'` → `'a/b.html'`. */
export function outputFileFor(route: SeoRoute): string {
  if (route.path === '/') return 'index.html'
  if (route.path === '*') return '404.html'
  return `${route.path.replace(/^\//, '')}.html`
}
