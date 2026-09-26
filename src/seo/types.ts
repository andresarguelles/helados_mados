/**
 * Contrato del manifiesto SEO.
 *
 * Cada ruta de la app tiene una entrada, y de esa entrada salen cuatro cosas que no pueden
 * divergir: el <head> del HTML prerenderizado, el <head> que se reescribe al navegar en el
 * cliente, el sitemap y las reglas de `vercel.json` (que `scripts/seo-check.mjs` verifica).
 */

/**
 * - `prerender`: se genera su HTML en build con el contenido real (indexable o no).
 * - `spa`: se sirve el shell vacío `spa.html` vía rewrite de Vercel; nunca se indexa.
 * - `redirect`: Vercel responde 308 a `redirectTo`; la app conserva su `<Navigate>` por si
 *   se llega navegando en el cliente.
 */
export type RouteKind = 'prerender' | 'spa' | 'redirect'

export interface Migas {
  nombre: string
  path: string
}

export interface SeoRoute {
  /** Tal cual aparece en `<Route path>`: '/', '/canjear', '/admin/dashboard', '*'. */
  path: string
  kind: RouteKind
  /** ≤ 60 caracteres en las indexables. */
  title: string
  /** 70–160 caracteres en las indexables. */
  description?: string
  /** true = entra al sitemap, lleva canonical y `index,follow`. */
  index: boolean
  /** Solo si `index` es false: 'noindex,follow' | 'noindex,nofollow'. */
  robots?: string
  /** Solo `kind: 'redirect'`. */
  redirectTo?: string
  ogType?: 'website' | 'article'
  /** Ruta absoluta desde la raíz del sitio ('/og/og-default.png'); por defecto la genérica. */
  ogImage?: string
  ogImageAlt?: string
  /** Objetos JSON-LD ya construidos (cada uno con @context y @type, o un @graph). */
  jsonLd?: object[]
  /** AAAA-MM-DD. Solo cuando se conoce de verdad; nunca la fecha del build. */
  lastmod?: string
  /** Migas para BreadcrumbList en las páginas secundarias. */
  migas?: Migas[]
}

/** Una etiqueta del <head>, en un formato que sirve igual al servidor y al cliente. */
export type HeadTag =
  | { tag: 'title'; key: 'title'; text: string }
  | { tag: 'meta'; key: string; attrs: Record<string, string> }
  | { tag: 'link'; key: string; attrs: Record<string, string> }
  | { tag: 'script'; key: string; attrs: Record<string, string>; text: string }

/*
 * Firmas que exporta el manifiesto (implementadas en src/seo/*.ts):
 *
 *   routes.ts
 *     export const SITE_URL: string                       // reexporta de src/content/negocio.ts
 *     export const SEO_ROUTES: readonly SeoRoute[]        // todas las rutas de <Routes>, incluidas spa y redirect
 *     export const NOT_FOUND: SeoRoute                    // path '*', kind 'prerender', index false → 404.html
 *     export const SPA_SHELL: SeoRoute                    // head de spa.html (noindex)
 *     export function seoForPath(pathname: string): SeoRoute   // matchPath case-insensitive; si no, NOT_FOUND
 *     export function canonicalFor(path: string): string  // '/' → SITE_URL + '/', '/x' → SITE_URL + '/x'
 *     export function outputFileFor(route: SeoRoute): string   // '/' → 'index.html', '*' → '404.html', '/x' → 'x.html'
 *
 *   head.ts
 *     export function buildHeadTags(route: SeoRoute): HeadTag[]
 *     export function headTagsToHtml(tags: HeadTag[]): string  // escapa atributos; JSON-LD con '<' → '<'
 *     export function applyHead(route: SeoRoute): void    // cliente: actualiza en sitio por [data-seo="<key>"]; no-op sin document
 *
 *   sitemap.ts
 *     export function buildSitemapXml(routes: readonly SeoRoute[]): string   // solo index: true
 */
