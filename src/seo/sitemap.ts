/**
 * `sitemap.xml`, generado del mismo manifiesto que el resto del SEO — nunca una lista
 * aparte que se pueda olvidar de actualizar.
 */
import { canonicalFor } from './routes'
import type { SeoRoute } from './types'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** `urlset` estándar con solo las rutas indexables. `<lastmod>` solo si se conoce de verdad. */
export function buildSitemapXml(routes: readonly SeoRoute[]): string {
  const urls = routes
    .filter(route => route.index)
    .map(route => {
      const loc = escapeXml(canonicalFor(route.path))
      const lastmod = route.lastmod ? `\n    <lastmod>${escapeXml(route.lastmod)}</lastmod>` : ''
      return `  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`
    })
    .join('\n')

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls}\n` +
    '</urlset>\n'
  )
}
